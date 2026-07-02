import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

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

  const { image, apiKey: userApiKey } = req.body ?? {};

  if (!image) {
    res.status(400).json({ error: 'Image data (base64) is required.' });
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

  let base64Data = image;
  let mimeType = 'image/jpeg';
  if (image.startsWith('data:')) {
    const m = image.match(/^data:([^;]+);base64,(.*)$/);
    if (m && m.length === 3) {
      mimeType = m[1];
      base64Data = m[2];
    }
  }

  const imagePart = { inlineData: { mimeType, data: base64Data } };
  const prompt = `You are an expert Japanese tourist visual companion.
The user is traveling in Japan and has loaded an image (e.g., of a Japanese restaurant menu, subway directions, retail store sign, receipt, or warning label).
Translate the Japanese (or foreign language) signs or text detected in the image into natural, clean Korean.
Return a structured JSON report: detectedText, translatedText, items (list of parsed elements with original, pronunciation in Korean Hangeul ONLY, translated, price), guideTip.`;

  try {
    const response = await generateWithFallback(
      ai,
      {
        contents: [imagePart, { text: prompt }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedText: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    original: { type: Type.STRING },
                    pronunciation: { type: Type.STRING },
                    translated: { type: Type.STRING },
                    price: { type: Type.STRING },
                  },
                  required: ['original', 'translated'],
                },
              },
              guideTip: { type: Type.STRING },
            },
            required: ['detectedText', 'translatedText', 'items'],
          },
        },
      },
      ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    );

    const json = JSON.parse(response.text.trim());
    res.json(json);
  } catch (err: any) {
    console.error('Image OCR Translate API Error:', err);
    const msg = err.message ?? '이미지 OCR 분석 및 번역 과정 중 오류가 발생했습니다.';
    res.status(500).json({ error: 'Image translation failed', message: msg });
  }
}
