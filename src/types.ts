/**
 * Types and Interfaces for the Japanese-Korean Real-time Translator
 */

export interface TranslationResult {
  translatedText: string;
  correctedSourceText?: string;
  pronunciation?: string; // Romaji or Korean phonetic spelling
  furigana?: string;      // Kanji with Hiragana assistance
  explanation?: string;   // Contextual or polite level tips for travelers
}

export interface HistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: 'ko' | 'ja';
  targetLang: 'ko' | 'ja';
  pronunciation?: string;
  furigana?: string;
  explanation?: string;
  timestamp: number;
  isFavorite: boolean;
}

export interface ConversationMessage {
  id: string;
  text: string;
  translatedText: string;
  sender: 'user' | 'partner'; // User is traveler, partner is local Japanese speaker
  lang: 'ko' | 'ja';
  pronunciation?: string;
  furigana?: string;
  timestamp: number;
}

export interface PhraseItem {
  id: string;
  category: string;
  korean: string;
  japanese: string;
  pronunciation: string;
  explanation?: string;
}
