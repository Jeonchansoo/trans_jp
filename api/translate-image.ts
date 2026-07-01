import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithFallback } from '../src/utils/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { image, targetLang, apiKey: userApiKey } = req.body ?? {};
  if (!image) {
    res.status(400).json({ error: 'Image data (base64) is required.' });
    return;
  }
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'API Key Missing',
      message: '설정에서 제미나이 API 키를 입력해주세요.',
    });
    return;
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
  // Clean base64 and mime
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
  const prompt = `You are an expert Japanese tourist visual companion.\nTranslate the image text into natural Korean. Return JSON with detectedText, translatedText, items, guideTip.`;
  try {
    const response = await generateContentWithFallback(
      ai,
      {
        model: 'gemini-3.5-flash',
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
      ['gemini-3.5-flash']
    );
    const json = JSON.parse(response.text.trim());
    res.json(json);
  } catch (err: any) {
    console.error('Image OCR Translate API Error:', err);
    const msg = err.message ?? '이미지 OCR 분석 및 번역 과정 중 오류가 발생했습니다.';
    res.status(500).json({ error: 'Image translation failed', message: msg });
  }
}
