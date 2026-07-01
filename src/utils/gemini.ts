import { GoogleGenAI } from '@google/genai';

/**
 * Generate content using a list of fallback Gemini models.
 * Tries each model in order until one succeeds.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: any,
  customModels?: string[]
) {
  const defaultModels = [
    'gemini-2.5-flash-lite-preview-06-17',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  const models = customModels || defaultModels;
  let lastError: any;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({ ...params, model });
      return response;
    } catch (e: any) {
      lastError = e;
      const msg = (e.message || '').toLowerCase();
      // Do not retry for key/permission errors
      if (msg.includes('key') || msg.includes('api_key') || msg.includes('invalid') || msg.includes('unauthorized')) {
        throw e;
      }
      // Small delay before next attempt
      await new Promise(r => setTimeout(r, 100));
    }
  }
  throw lastError;
}
