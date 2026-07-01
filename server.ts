import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express app
const app = express();
const PORT = Number(process.env.PORT || "3000");

// Set request size limits for uploading camera travel photos
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for Google Gen AI client
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not defined. AI translator requests will fail until configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY_FOR_STANDBY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Helper to execute generateContent with fallback models to survive temporary peak-demand (503) spikes.
 * Accepts a custom models list to prioritize speed/accuracy correctly.
 */
async function generateContentWithFallback(ai: GoogleGenAI, params: any, customModels?: string[]) {
  const defaultModels = [
    "gemini-2.5-flash-lite-preview-06-17",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];
  const modelsToTry = customModels || defaultModels;
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini API] Requesting content with model: ${model}`);
      const fallbackParams = {
        ...params,
        model: model
      };
      const response = await ai.models.generateContent(fallbackParams);
      return response;
    } catch (err: any) {
      const errMsg = (err.message || "").toLowerCase();
      console.warn(`[Gemini API] Model ${model} returned error. Msg: ${err.message}. Code: ${err.code}`);
      lastError = err;

      // Avoid retrying only if the API key itself is missing, invalid, or unauthorized.
      // Model "not found" errors should fall through to the next candidate.
      if (
        errMsg.includes("key") || 
        errMsg.includes("api_key") || 
        errMsg.includes("invalid") || 
        errMsg.includes("unauthorized")
      ) {
        throw err;
      }
      
      // Zero-delay breathing to keep things nimble and fast
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw lastError || new Error("모든 번역 모델 요청이 실패하였습니다. 잠시 후 상단의 번역 버튼을 다시 눌러 주십시오.");
}

/**
 * 0. Get Server Configuration API Route
 */
app.get("/api/config", (req, res) => {
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY
  });
});

/**
 * 1. Bidirectional Translation API Route
 * Input: { text, sourceLang, targetLang, apiKey }
 */
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang, apiKey: userApiKey } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text is required for translation." });
  }

  // Use user-provided API key if available, otherwise fall back to environment variable
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "API Key Missing",
      message: "설정에서 제미나이 API 키를 입력해주세요. Google AI Studio에서 무료로 발급받을 수 있습니다."
    });
  }

  // Create AI client with the provided key
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const prompt = `
    You are an expert real-time translator specializing in Japanese and Korean travel conversations.
    Translate the following text. Be extremely fast and concise!
    Source language: ${sourceLang === "ko" ? "Korean (한국어)" : "Japanese (일본어)"}
    Target language: ${targetLang === "ko" ? "Korean (한국어)" : "Japanese (일본어)"}
    Text to translate: ${text}

    Analyze the translation context:
    - The input text comes from browser-native voice recognition (STT), which may contain phonetic errors, bad spacing, homophone slips, or garbled syllables due to different voice pitches, demographics (men, women, children, elderly), or speech rates.
    - You must reconstruct the speaker's true intent. Correct these phonetic mishearings, typos, and spacing errors in the source language (e.g., "탁구야끼" -> "타코야키", "아리가또" -> "아리가토") to produce a natural travel phrasing. Return this corrected string in "correctedSourceText".
    - If translating Korean to Japanese, provide:
       - Highly natural translated Japanese text (polite/conversational, suitable for travelers speaking to locals, e.g., shopkeepers, train officers).
       - Pronunciation guide: Sounding-out of Japanese ONLY in Korean letters/Hangeul (e.g. "아리가토-고자이마스"). Do NOT include any English Romaji or other scripts. ONLY Korean characters.
       - Furigana format: Kanji with Hiragana assistance formatted elegantly with brackets (e.g. "日本[にほん]에 가다" -> the Japanese sections should show bracketed furigana right next to the kanji, like "昨日[きの우] 나는...").
       - Explanation (in Korean): Contextual nuance, polite level check, or small travel tip. KEEP IT EXTREMELY SHORT (1 sentence max).
    - If translating Japanese to Korean, provide:
       - Natural Korean text translation.
       - Pronunciation guide: How to read the original Japanese text ONLY in Korean characters/Hangeul (e.g. for Japanese "こんにちは", write "콘니치와").
       - Explanations (in Korean): Notes about what the Japanese word means, its cultural context in Japan. KEEP IT EXTREMELY SHORT (1 sentence max).

    Provide response in JSON matching the specified schema. Keep descriptions and translations very brief to maximize speed.
  `;

  try {
    // For text translation, prioritize the fast low-latency models
    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: "The translated text in the target language (Korean or Japanese)."
            },
            correctedSourceText: {
              type: Type.STRING,
              description: "The corrected source text. If you fixed voice transcription typos or poor spacing, return the corrected string in the source language. If no correction was needed, return the original string."
            },
            pronunciation: {
              type: Type.STRING,
              description: "Pronunciation guide of the Japanese portion using Korean characters (Hangeul) only, e.g. '아리가토-고자이마스'. Do NOT write in Romaji or English alphabets. Hangeul only."
            },
            furigana: {
              type: Type.STRING,
              description: "For Japanese target: Kanji with bracketed Hiragana (e.g., 私[わたし]는...). For Korean target, you may leave empty or provide kanji context if useful."
            },
            explanation: {
              type: Type.STRING,
              description: "Traveler context, grammatical politeness level, or local cultural advice in Korean. Very short."
            }
          },
          required: ["translatedText", "correctedSourceText"]
        }
      }
    }, [
      "gemini-2.5-flash-lite-preview-06-17",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ]);

    const resultText = response.text;
    if (!resultText) {
      throw new Error("제미나이 AI 로부터 응답 데이터를 수신하지 못했습니다.");
    }

    const jsonResponse = JSON.parse(resultText.trim());
    res.json(jsonResponse);
  } catch (err: any) {
    console.error("Translation API Error:", err);
    
    let userFriendlyMsg = err.message || "번역 처리 중 예기치 못한 요건이 감지되었습니다.";
    if (userFriendlyMsg.includes("demand") || err.status === "UNAVAILABLE" || err.code === 503) {
      userFriendlyMsg = "현재 제미나이 AI 번역 서버가 임시 요청 폭주 상태입니다. 잠시 후 국문/일문 입력창 오른쪽의 '실시간 번역' 버튼을 3초 뒤 한 번 더 눌러주세요!";
    }
    
    res.status(500).json({
      error: "Translation failed",
      message: userFriendlyMsg
    });
  }
});

/**
 * 2. Visual / Camera Image OCR and Translation API Route
 * Input: { image (base64 data), sourceLang, targetLang, apiKey }
 */
app.post("/api/translate-image", async (req, res) => {
  const { image, targetLang, apiKey: userApiKey } = req.body;

  if (!image) {
    return res.status(400).json({ error: "Image data (base64) is required." });
  }

  // Use user-provided API key if available, otherwise fall back to environment variable
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "API Key Missing",
      message: "설정에서 제미나이 API 키를 입력해주세요. Google AI Studio에서 무료로 발급받을 수 있습니다."
    });
  }

  // Create AI client with the provided key
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Extract pure base64 database from standard inline-data URI format
  let base64Data = image;
  let mimeType = "image/jpeg";

  if (image.startsWith("data:")) {
    const matches = image.match(/^data:([^;]+);base64,(.*)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
  }

  const prompt = `
    You are an expert Japanese tourist visual companion.
    The user is traveling in Japan and has loaded an image (e.g., of a Japanese restaurant menu, subway directions, retail store sign, receipt, or warning label).
    
    Translate the Japanese (or foreign language) signs or text detected in the image into natural, clean Korean.
    
    Return a structured JSON report breaking down:
    1. detectedText: The primary detected native Japanese/English characters in the image.
    2. translatedText: The general summarized Korean translation.
    3. items: A list of specific items or textual elements parsed from the sign (e.g. for restaurant menu items: list each dish's original name, reading pronunciation inside Korean characters ONLY, price in Yen if visible, and description in Korean; for signs: list each sign section, translated value, and local instruction).
    4. guideTip: A custom practical travel advice for this specific kind of menu/sign (e.g. "이 음식은 알레르기 성분(메밀 등)이 포함되어 있을 수 있습니다", "일본 열차의 급행 표시는 추가 요금이 있을 수 있으니 주의하세요.").
    
    Be accurate, clear, and tourist-friendly!
  `;

  try {
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const response = await generateContentWithFallback(ai, {
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: prompt }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedText: { type: Type.STRING, description: "All detected original text (Japanese/English)." },
            translatedText: { type: Type.STRING, description: "Summarized or title translation in Korean." },
            items: {
              type: Type.ARRAY,
              description: "Items parsed individually (such as menu items, sign directions).",
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING, description: "Original text section (e.g. 醤油ラーメン)" },
                  pronunciation: { type: Type.STRING, description: "Reading pronunciation in Korean (e.g. 쇼유라멘). No English romaji." },
                  translated: { type: Type.STRING, description: "Translated clean Korean meaning (e.g. 간장 라면)" },
                  price: { type: Type.STRING, description: "Yen price if visible, otherwise leave blank or N/A" }
                },
                required: ["original", "translated"]
              }
            },
            guideTip: { type: Type.STRING, description: "A highly useful traveler suggestion related to this image contents." }
          },
          required: ["detectedText", "translatedText", "items"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("이미지 분석 결과를 제미나이 AI 서버로부터 수신하지 못했습니다.");
    }

    const jsonResponse = JSON.parse(resultText.trim());
    res.json(jsonResponse);
  } catch (err: any) {
    console.error("Image OCR Translate API Error:", err);
    
    let userFriendlyMsg = err.message || "이미지 OCR 분석 및 번역 과정 중 발생한 에러입니다.";
    if (userFriendlyMsg.includes("demand") || err.status === "UNAVAILABLE" || err.code === 503) {
      userFriendlyMsg = "현재 제미나이 이미지 분석 서버 트래픽이 일시적으로 혼잡합니다. 3초 후 'AI 메뉴판/표지판 번역 실행' 버튼을 한 번 더 클릭해주세요!";
    }
    
    res.status(500).json({
      error: "Image translation failed",
      message: userFriendlyMsg
    });
  }
});

/**
 * 3. Speech to Text (STT) Audio Transcription API Route
 * Input: { audio (base64 data), mimeType, language, apiKey }
 */
app.post("/api/transcribe", async (req, res) => {
  const { audio, mimeType, language, apiKey: userApiKey } = req.body;

  if (!audio) {
    return res.status(400).json({ error: "Audio data (base64) is required." });
  }

  // Use user-provided API key if available, otherwise fall back to environment variable
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "API Key Missing",
      message: "설정에서 제미나이 API 키를 입력해주세요. Google AI Studio에서 무료로 발급받을 수 있습니다."
    });
  }

  // Create AI client with the provided key
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Extract clean mimeType without options (e.g. audio/webm;codecs=opus -> audio/webm)
  const cleanMimeType = (mimeType || "audio/webm").split(";")[0].trim();

  const isKorean = language === "ko";
  const prompt = isKorean
    ? `You are a specialized Korean speech-to-text (STT) transcription engine.

TASK: Transcribe the spoken Korean audio into Korean text.

CRITICAL RULES:
1. Output ONLY the transcribed Korean text. No explanations, labels, or wrapper text.
2. Correct natural phonetic variations from different speakers (male/female/child/elderly):
   - Apply proper Korean spacing (띄어쓰기)
   - Convert phonetic approximations to correct Korean: e.g. "어빠" → "오빠", "해써요" → "했어요"
3. Remove filler words: "음", "아", "어", "그", "저", "뭐", "네", "예" (when used as filler only)
4. Preserve sentence-ending particles (요, 이에요, ㅂ니다, 야, etc.) as spoken.
5. If audio is silent, too short, or completely unintelligible, return exactly: [EMPTY]
6. Do NOT translate. Transcribe only.`
    : `You are a specialized Japanese speech-to-text (STT) transcription engine.

TASK: Transcribe the spoken Japanese audio into Japanese text.

CRITICAL RULES:
1. Output ONLY the transcribed Japanese text. No explanations, labels, or wrapper text.
2. Use appropriate Kanji/Kana (標準的な漢字かな混じり文).
3. Correct phonetic variations from different speakers (male/female/child/elderly):
   - e.g. "アリガトゴジャマス" → "ありがとうございます"
   - e.g. "スミマセン" → "すみません"
4. Remove filler words: "えー", "あの", "えっと", "まあ", "ね" (as filler)
5. Preserve sentence-ending forms (です, ます, だ, etc.) as spoken.
6. If audio is silent, too short, or completely unintelligible, return exactly: [EMPTY]
7. Do NOT translate. Transcribe only.`;

  try {
    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: audio,
      },
    };

    // Use fast models for transcription
    const response = await generateContentWithFallback(ai, {
      contents: [audioPart, { text: prompt }],
    }, [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-3.5-flash"
    ]);

    const transcribedText = (response.text || "").trim();
    res.json({ text: transcribedText });
  } catch (err: any) {
    console.error("Transcribe API Error:", err);
    
    let userFriendlyMsg = err.message || "음성 인식 처리 중 오류가 발생했습니다.";
    if (userFriendlyMsg.includes("demand") || err.status === "UNAVAILABLE" || err.code === 503) {
      userFriendlyMsg = "현재 제미나이 AI 서버가 일시적인 요청 초과 상태입니다. 잠시 후 다시 시도해 주세요.";
    }
    
    res.status(500).json({
      error: "Transcription failed",
      message: userFriendlyMsg
    });
  }
});

const HOST = process.env.HOST || "0.0.0.0";

// Configure Vite custom middleware or stand-alone express serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production assets registered at dist/ directory.");
  }

  const srv = app.listen(PORT, HOST, function () {
    const displayHost = HOST === "0.0.0.0" || HOST === "::" ? "localhost" : HOST;
    console.log(`🚀 Japan Travel Translator Server booted on http://${displayHost}:${PORT}`);
  });
}

setupServer().catch((error) => {
  console.error("Failed to start travel translator server:", error);
});
