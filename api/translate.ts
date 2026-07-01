import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';
import { generateContentWithFallback } from '../src/utils/gemini';

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
      message: '설정에서 제미나이 API 키를 입력해주세요.',
    });
    return;
  }
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
  const prompt = `\nYou are an expert real‑time translator specializing in Japanese and Korean travel conversations.\nTranslate the following text.\nSource language: ${sourceLang === 'ko' ? 'Korean (한국어)' : 'Japanese (일본어)'}\nTarget language: ${targetLang === 'ko' ? 'Korean (한국어)' : 'Japanese (일본어)'}\nText to translate: ${text}\n\nProvide response in JSON matching the schema used by the client.`;
  try {
    const response = await generateContentWithFallback(
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
      [
        'gemini-2.5-flash-lite-preview-06-17',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ]
    );
    const json = JSON.parse(response.text.trim());
    res.json(json);
  } catch (err: any) {
    console.error('Translation API Error:', err);
    const msg = err.message ?? '번역 처리 중 예기치 못한 오류가 발생했습니다.';
    res.status(500).json({ error: 'Translation failed', message: msg });
  }
}
