import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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

  const { audio, mimeType, language, apiKey: userApiKey } = req.body ?? {};

  if (!audio) {
    res.status(400).json({ error: 'Audio data (base64) is required.' });
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

  const cleanMime = (mimeType || 'audio/webm').split(';')[0].trim();
  const isKorean = language === 'ko';

  const prompt = isKorean
    ? `You are a specialized Korean speech-to-text (STT) transcription engine.

TASK: Transcribe the spoken Korean audio into Korean text.

CRITICAL RULES:
1. Output ONLY the transcribed Korean text. No explanations, labels, or wrapper text.
2. Correct natural phonetic variations from different speakers (male/female/child/elderly).
3. Apply proper Korean spacing (띄어쓰기).
4. Convert phonetic approximations to correct Korean: e.g. "어빠" → "오빠", "해써요" → "했어요".
5. Remove filler words: "음", "아", "어", "그", "저", "뭐" (when used as filler only).
6. Preserve sentence-ending particles (요, 이에요, ㅂ니다, 야, etc.) as spoken.
7. If audio is silent, too short, or completely unintelligible, return exactly: [EMPTY]
8. Do NOT translate. Transcribe only.`
    : `You are a specialized Japanese speech-to-text (STT) transcription engine.

TASK: Transcribe the spoken Japanese audio into Japanese text.

CRITICAL RULES:
1. Output ONLY the transcribed Japanese text. No explanations, labels, or wrapper text.
2. Use appropriate Kanji/Kana (標準的な漢字かな混じり文).
3. Correct phonetic variations from different speakers (male/female/child/elderly).
4. Remove filler words: "えー", "あの", "えっと", "まあ", "ね" (as filler).
5. Preserve sentence-ending forms (です, ます, だ, etc.) as spoken.
6. If audio is silent, too short, or completely unintelligible, return exactly: [EMPTY]
7. Do NOT translate. Transcribe only.`;

  try {
    const audioPart = { inlineData: { mimeType: cleanMime, data: audio } };
    const response = await generateWithFallback(
      ai,
      { contents: [audioPart, { text: prompt }] },
      ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
    );
    const result = (response.text || '').trim();
    res.json({ text: result });
  } catch (err: any) {
    console.error('Transcribe API Error:', err);
    let msg = err.message ?? '음성 인식 처리 중 오류가 발생했습니다.';
    if (msg.includes('demand') || err.status === 'UNAVAILABLE' || err.code === 503) {
      msg = '현재 제미나이 AI 서버가 일시적인 요청 초과 상태입니다. 잠시 후 다시 시도해 주세요.';
    }
    res.status(500).json({ error: 'Transcription failed', message: msg });
  }
}
