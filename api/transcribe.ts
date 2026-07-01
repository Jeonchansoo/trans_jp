import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { generateContentWithFallback } from '../src/utils/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const { audio, mimeType, language, apiKey: userApiKey } = req.body ?? {};
  if (!audio) {
    res.status(400).json({ error: 'Audio data (base64) is required.' });
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
  const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();
  const isKorean = language === 'ko';
  const prompt = isKorean
    ? `You are a specialized Korean speech‑to‑text (STT) transcription engine.\n\nTASK: Transcribe the spoken Korean audio into Korean text.\n\nCRITICAL RULES:\n1. Output ONLY the transcribed Korean text. No explanations, labels, or wrapper text.\n2. Correct natural phonetic variations from different speakers (male/female/child/elderly).\n3. Apply proper Korean spacing.\n4. Remove filler words.\n5. Preserve sentence‑ending particles.\n6. If audio is silent or unintelligible, return exactly: [EMPTY]`
    : `You are a specialized Japanese speech‑to‑text (STT) transcription engine.\n\nTASK: Transcribe the spoken Japanese audio into Japanese text.\n\nCRITICAL RULES:\n1. Output ONLY the transcribed Japanese text. No explanations, labels, or wrapper text.\n2. Use appropriate Kanji/Kana.\n3. Correct phonetic variations.\n4. Remove filler words.\n5. Preserve sentence‑ending forms.\n6. If audio is silent or unintelligible, return exactly: [EMPTY]`;
  try {
    const audioPart = { inlineData: { mimeType: cleanMime, data: audio } };
    const response = await generateContentWithFallback(
      ai,
      { contents: [audioPart, { text: prompt }] },
      ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-3.5-flash']
    );
    const result = (response.text || '').trim();
    res.json({ text: result });
  } catch (err: any) {
    console.error('Transcribe API Error:', err);
    const msg = err.message ?? '음성 인식 처리 중 오류가 발생했습니다.';
    res.status(500).json({ error: 'Transcription failed', message: msg });
  }
}
