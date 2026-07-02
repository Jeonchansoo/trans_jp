import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

// Inline fallback logic to avoid cross-module ESM/CJS import issues on Vercel
async function generateWithFallback(ai: GoogleGenAI, params: any, models: string[]) {
  let lastError: any;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ ...params, model });
      return response;
    } catch (e: any) {
      lastError = e;
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('key') || msg.includes('api_key') || msg.includes('invalid') || msg.includes('unauthorized')) {
        throw e;
      }
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw lastError;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { text, sourceLang, targetLang, apiKey: userApiKey } = req.body ?? {};

  if (!text?.trim()) {
    res.status(400).json({ error: 'Text is required for translation.' });
    return;
  }

  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'API Key Missing',
      message: '설정에서 제미나이 API 키를 입력해주세요. Google AI Studio에서 무료로 발급받을 수 있습니다.',
    });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const prompt = `
You are an expert real-time translator specializing in Japanese and Korean travel conversations.
Translate the following text. Be extremely fast and concise!
Source language: ${sourceLang === 'ko' ? 'Korean (한국어)' : 'Japanese (일본어)'}
Target language: ${targetLang === 'ko' ? 'Korean (한국어)' : 'Japanese (일본어)'}
Text to translate: ${text}

Analyze the translation context:
- The input text comes from browser-native voice recognition (STT), which may contain phonetic errors.
- Correct phonetic mishearings to produce natural travel phrasing. Return corrected string in "correctedSourceText".
- If translating Korean to Japanese, provide:
   - Natural translated Japanese text (polite/conversational for travelers).
   - Pronunciation guide in Korean characters (Hangeul) ONLY. No English Romaji.
   - Furigana format: Kanji with bracketed Hiragana (e.g., 日本[にほん]).
   - Explanation (in Korean): Very short (1 sentence max).
- If translating Japanese to Korean, provide:
   - Natural Korean text translation.
   - Pronunciation guide in Korean characters (Hangeul) ONLY.
   - Explanation (in Korean): Very short (1 sentence max).

Provide response in JSON matching the specified schema.`;

  try {
    const response = await generateWithFallback(
      ai,
      {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedText: { type: Type.STRING },
              correctedSourceText: { type: Type.STRING },
              pronunciation: { type: Type.STRING },
              furigana: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['translatedText', 'correctedSourceText'],
          },
        },
      },
      ['gemini-2.5-flash-lite-preview-06-17', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    );

    const json = JSON.parse(response.text.trim());
    res.json(json);
  } catch (err: any) {
    console.error('Translation API Error:', err);
    let msg = err.message ?? '번역 처리 중 예기치 못한 오류가 발생했습니다.';
    if (msg.includes('demand') || err.status === 'UNAVAILABLE' || err.code === 503) {
      msg = '현재 제미나이 AI 서버가 일시적인 요청 초과 상태입니다. 잠시 후 다시 시도해 주세요.';
    }
    res.status(500).json({ error: 'Translation failed', message: msg });
  }
}
