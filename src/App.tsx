/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Languages, 
  Mic, 
  MicOff, 
  Volume2, 
  Camera, 
  BookOpen, 
  History, 
  Star, 
  ArrowLeftRight, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  Upload, 
  AlertCircle, 
  Compass, 
  Search,
  BookMarked,
  Info,
  Settings,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RotateCw,
  Video,
  VideoOff,
  RefreshCw
} from "lucide-react";
import { TRAVEL_PHRASE_CATEGORIES } from "./phraseData";
import { TranslationResult, HistoryItem, ConversationMessage } from "./types";

export default function App() {
  // Navigation states: 'translate' (Voice/Text), 'dialogue' (Bidirectional Conversation), 'camera' (Image OCR), 'phrasebook' (Korean-Japanese Survival Phrases), 'history' (Saved logs)
  const [activeTab, setActiveTab] = useState<'translate' | 'dialogue' | 'camera' | 'phrasebook' | 'history'>('translate');



  // Dialogue Screen States
  const [dialogueKoText, setDialogueKoText] = useState<string>("");
  const [dialogueJaText, setDialogueJaText] = useState<string>("");
  const [dialogueIsListening, setDialogueIsListening] = useState<'none' | 'ko' | 'ja'>('none');
  const [dialogueIsTranslating, setDialogueIsTranslating] = useState<boolean>(false);
  const [dialogueFlipped, setDialogueFlipped] = useState<boolean>(false);

  // Core Translator States
  const [sourceLang, setSourceLang] = useState<'ko' | 'ja'>('ko');
  const [targetLang, setTargetLang] = useState<'ko' | 'ja'>('ja');
  const [sourceText, setSourceText] = useState<string>("");
  const [translatedResult, setTranslatedResult] = useState<TranslationResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  
  // Voice recognition states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceSupport, setVoiceSupport] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [dialogueSpeechError, setDialogueSpeechError] = useState<{ lang: 'ko' | 'ja'; message: string } | null>(null);
  const speechRecognizedRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<any>(null);

  // AI Speech recognition states and refs
  const [sttMode, setSttMode] = useState<'browser' | 'ai'>(() => {
    const saved = localStorage.getItem("japan_travel_stt_mode");
    if (saved === 'browser' || saved === 'ai') return saved;
    const userKey = localStorage.getItem("japan_travel_user_api_key");
    return userKey ? 'ai' : 'browser';
  });
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<any>(null);
  const [isPreparingVoice, setIsPreparingVoice] = useState<boolean>(false);

  // Travel Phrasebook States
  const [selectedCategory, setSelectedCategory] = useState<string>("greetings");
  const [phraseSearch, setPhraseSearch] = useState<string>("");

  // Visual/Camera Translator States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState<boolean>(false);
  const [imageResult, setImageResult] = useState<{
    detectedText: string;
    translatedText: string;
    items: { original: string; pronunciation: string; translated: string; price?: string }[];
    guideTip?: string;
  } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Live video stream camera states & refs
  const [isLiveCameraActive, setIsLiveCameraActive] = useState<boolean>(false);
  const [isAutoScanActive, setIsAutoScanActive] = useState<boolean>(false);
  const [isAnalyzingLiveFrame, setIsAnalyzingLiveFrame] = useState<boolean>(false);
  const [liveCameraError, setLiveCameraError] = useState<string | null>(null);
  const [liveImageResult, setLiveImageResult] = useState<{
    detectedText: string;
    translatedText: string;
    items: { original: string; pronunciation: string; translated: string; price?: string }[];
    guideTip?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanTimerRef = useRef<any>(null);

  // History & Saved (Favorites) States
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);

  // Split-destination Real-time feed records (translateFeed doubles as conversation log)
  const [activeFeedTab, setActiveFeedTab] = useState<'translate' | 'dialogue'>('translate');
  const [translateFeed, setTranslateFeed] = useState<ConversationMessage[]>([]);
  const [dialogueFeed, setDialogueFeed] = useState<ConversationMessage[]>([]);

  // Audio Playback Mode: 'manual' (click speaker) vs 'auto' (plays immediately after translation)
  const [audioPlayMode, setAudioPlayMode] = useState<'manual' | 'auto'>(() => {
    return (localStorage.getItem("japan_travel_audio_mode") as 'manual' | 'auto') || 'auto';
  });

  // Voice Speaker gender selection state: 'female' or 'male'
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>(() => {
    return (localStorage.getItem("japan_travel_voice_gender") as 'female' | 'male') || 'female';
  });

  // Settings Panel Toggle State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // User-provided API Key state
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("japan_travel_user_api_key") || "";
  });

  const [hasServerApiKey, setHasServerApiKey] = useState<boolean>(false);

  const handleSaveApiKey = (key: string) => {
    // Validate API key format (Google AI Studio keys start with "AIza" or "AQ.")
    if (key && !key.startsWith("AIza") && !key.startsWith("AQ.")) {
      alert("⚠️ API 키 형식이 올바르지 않습니다.\n\nGoogle AI Studio에서 발급받은 키는 'AIza' 또는 'AQ.'로 시작합니다.\n올바른 키를 입력해 주세요.");
      return;
    }
    
    if (key && key.length < 20) {
      alert("⚠️ API 키가 너무 짧습니다.\n\n올바른 Google AI Studio API 키를 입력해 주세요.");
      return;
    }

    setUserApiKey(key);
    localStorage.setItem("japan_travel_user_api_key", key);
    setApiError(null);
    
    if (key.trim()) {
      alert("✅ API 키가 저장되었습니다!");
    }
  };

  // Feedback/Error Toast
  const [apiError, setApiError] = useState<{ type: 'error' | 'warning', message: string } | null>(null);

  // Simple in-memory + localStorage translation cache to reduce repeat latency
  const [translateCache, setTranslateCache] = useState<Record<string, TranslationResult>>(() => {
    try {
      const raw = localStorage.getItem('translate_cache_v1');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  });

  const getCachedTranslation = (key: string) => {
    return translateCache[key] || null;
  };

  const setCachedTranslation = (key: string, value: TranslationResult) => {
    const next = { ...translateCache, [key]: value };
    setTranslateCache(next);
    try { localStorage.setItem('translate_cache_v1', JSON.stringify(next)); } catch (e) { /** ignore storage errors */ }
  };

  const handleDialogueSpeechResultRef = useRef<any>(null);
  const handleTranslateRef = useRef<any>(null);

  // Initialize Speech Recognition & Load Local Storage History
  useEffect(() => {
    // Check server configuration for API key
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        setHasServerApiKey(!!data.hasApiKey);
        if (data.hasApiKey) {
          if (!localStorage.getItem("japan_travel_stt_mode")) {
            setSttMode('ai');
          }
        } else {
          const userKey = localStorage.getItem("japan_travel_user_api_key");
          if (!userKey) {
            setSttMode('browser');
          }
        }
      })
      .catch(e => console.warn("Failed to fetch server config", e));

    // Check Speech Recognition capability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupport(false);
    } else {
      setVoiceSupport(true);
    }

    // Load custom history
    const saved = localStorage.getItem("japan_travel_translations_history_v1");
    if (saved) {
      try {
        setHistoryItems(JSON.parse(saved));
      } catch (err) {
        console.error("Failed loading persistent history", err);
      }
    }

    // Load custom feeds
    const savedTranslateFeed = localStorage.getItem("japan_travel_translate_feed_v1");
    if (savedTranslateFeed) {
      try {
        setTranslateFeed(JSON.parse(savedTranslateFeed));
      } catch (err) {
        console.error("Failed loading translate feed", err);
      }
    }

    const savedDialogueFeed = localStorage.getItem("japan_travel_dialogue_feed_v1");
    if (savedDialogueFeed) {
      try {
        setDialogueFeed(JSON.parse(savedDialogueFeed));
      } catch (err) {
        console.error("Failed loading dialogue feed", err);
      }
    }
  }, []);

  // Save history helper
  const saveHistory = (items: HistoryItem[] | ((prev: HistoryItem[]) => HistoryItem[])) => {
    if (typeof items === 'function') {
      setHistoryItems(prev => {
        const next = items(prev);
        localStorage.setItem("japan_travel_translations_history_v1", JSON.stringify(next));
        return next;
      });
    } else {
      setHistoryItems(items);
      localStorage.setItem("japan_travel_translations_history_v1", JSON.stringify(items));
    }
  };

  const saveTranslateFeed = (items: ConversationMessage[] | ((prev: ConversationMessage[]) => ConversationMessage[])) => {
    if (typeof items === 'function') {
      setTranslateFeed(prev => {
        const next = items(prev);
        localStorage.setItem("japan_travel_translate_feed_v1", JSON.stringify(next));
        return next;
      });
    } else {
      setTranslateFeed(items);
      localStorage.setItem("japan_travel_translate_feed_v1", JSON.stringify(items));
    }
  };

  const saveDialogueFeed = (items: ConversationMessage[] | ((prev: ConversationMessage[]) => ConversationMessage[])) => {
    if (typeof items === 'function') {
      setDialogueFeed(prev => {
        const next = items(prev);
        localStorage.setItem("japan_travel_dialogue_feed_v1", JSON.stringify(next));
        return next;
      });
    } else {
      setDialogueFeed(items);
      localStorage.setItem("japan_travel_dialogue_feed_v1", JSON.stringify(items));
    }
  };

  // Toggle Language direction
  const handleSwapLanguages = () => {
    const prevSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);
    setSourceText("");
    setTranslatedResult(null);
  };

  // Main translation function
  const handleTranslate = async (textToTranslate = sourceText) => {
    const cleanText = textToTranslate.trim();
    if (!cleanText) return;

    // Check if API Key is configured before sending request
    const hasKey = userApiKey.trim() || hasServerApiKey;
    if (!hasKey) {
      setApiError({
        type: 'error',
        message: "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요."
      });
      return;
    }

    // Check client-side cache first to reduce repeated translation latency
    const cacheKey = `${sourceLang}:${targetLang}:${cleanText}`;
    const cached = getCachedTranslation(cacheKey);
    if (cached) {
      setTranslatedResult(cached);
      if (audioPlayMode === 'auto') handlePlayTTS(cached.translatedText, targetLang);
      // update history/feed quickly without waiting network
      const userMessage: ConversationMessage = {
        id: "msg-cache-" + Date.now(),
        text: cleanText,
        translatedText: cached.translatedText,
        sender: sourceLang === 'ko' ? 'user' : 'partner',
        lang: sourceLang,
        pronunciation: cached.pronunciation,
        furigana: cached.furigana,
        timestamp: Date.now()
      };
      saveTranslateFeed(prev => [userMessage, ...prev].slice(0, 25));
      return;
    }

    setIsTranslating(true);
    setApiError(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          sourceLang,
          targetLang,
          apiKey: userApiKey
        })
      });

      if (!response.ok) {
        let errorMsg = "서버 혹은 API 통신 실패";
        try {
          const errBody = await response.json();
          errorMsg = errBody.message || errBody.error || errorMsg;
        } catch (e) {
          if (response.status === 500 && !userApiKey.trim() && !hasServerApiKey) {
            errorMsg = "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.";
          } else {
            errorMsg = `서버 오류 (${response.status}): 요청을 처리할 수 없습니다.`;
          }
        }
        throw new Error(errorMsg);
      }

      const data: TranslationResult = await response.json();
      setTranslatedResult(data);
      // Cache the result to speed up repeated queries
      try { setCachedTranslation(cacheKey, data); } catch (e) { /* ignore */ }

      // Auto TTS if enabled
      if (audioPlayMode === 'auto') {
        handlePlayTTS(data.translatedText, targetLang);
      }

      // Create translation history record
      const newHistoryItem: HistoryItem = {
        id: "hist-" + Date.now(),
        sourceText: cleanText,
        translatedText: data.translatedText,
        sourceLang,
        targetLang,
        pronunciation: data.pronunciation,
        furigana: data.furigana,
        explanation: data.explanation,
        timestamp: Date.now(),
        isFavorite: false
      };

      saveHistory(prev => [newHistoryItem, ...prev]);

      // Add to conversation chat log as users converse
      const userMessage: ConversationMessage = {
        id: "msg-user-" + Date.now(),
        text: cleanText,
        translatedText: data.translatedText,
        sender: sourceLang === 'ko' ? 'user' : 'partner',
        lang: sourceLang,
        pronunciation: data.pronunciation,
        furigana: data.furigana,
        timestamp: Date.now()
      };
      saveTranslateFeed(prev => [userMessage, ...prev].slice(0, 25));

    } catch (err: any) {
      console.error("Translation Client Error:", err);
      setApiError({
        type: 'error',
        message: err.message || "연결 중 문제가 발생했습니다. API 키 구성을 한 번 더 점검해 주세요!"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Trigger TTS Text to Speech audio synthesis
  const handlePlayTTS = (text: string, langCode: 'ko' | 'ja', genderOverride?: 'female' | 'male') => {
    if (!('speechSynthesis' in window)) {
      alert("이 브라우저는 음성 합성(TTS) 기능을 직접 지원하지 않습니다. 최신 브라우저를 이용해 주세요.");
      return;
    }

    const activeGender = genderOverride || voiceGender;

    try {
      window.speechSynthesis.cancel(); // stop any current sound completely
      
      // Clean text from furigana helper brackets like 日本[에 가다]/일본어[일본어] -> ?
      const cleanAudioText = text.replace(/\[([^\]]+)\]/g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanAudioText);
      utterance.lang = langCode === 'ja' ? 'ja-JP' : 'ko-KR';
      
      // Set speech rate to absolute natural standard (1.0) to prevent any codec stutter/cracking
      utterance.rate = 1.0;

      // Locate matching locale voices
      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | null = null;

      let isActuallyMale = false;

      if (voices.length > 0) {
        const matchingLocaleVoices = voices.filter(v => v.lang.startsWith(langCode === 'ja' ? 'ja' : 'ko'));
        
        // Comprehensive list of gender-specific names across typical OS voice libraries
        const femaleKeywords = [
          "female", "woman", "girl", "yuna", "sena", "heami", "sun-hi", 
          "haruka", "kyoko", "sakura", "yumi", "ayumi", "anna", "nanami", 
          "mizuki", "sayaka", "mei", "salli", "jimin"
        ];
        
        const maleKeywords = [
          "male", "man", "boy", "min-ho", "minho", "in-joon", "injoon", "tae-hee", "taehee", "otoya", 
          "keiji", "ichiro", "koki", "shinji", "kazuya", "daichi", "han", "korean male", "japanese male"
        ];

        if (activeGender === 'female') {
          chosenVoice = matchingLocaleVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            return femaleKeywords.some(kw => nameLower.includes(kw));
          }) || null;
        } else {
          chosenVoice = matchingLocaleVoices.find(v => {
            const nameLower = v.name.toLowerCase();
            return maleKeywords.some(kw => nameLower.includes(kw));
          }) || null;
          if (chosenVoice) {
            isActuallyMale = true;
          }
        }

        // Fallback to standard Google voice or general matching locale voice if gender-specific is not found
        if (!chosenVoice) {
          if (activeGender === 'female') {
            chosenVoice = matchingLocaleVoices.find(v => v.name.includes("Google")) || matchingLocaleVoices[0] || null;
          } else {
            // Google online/network female voices completely ignore the custom pitch setting.
            // Therefore, to successfully simulate a male voice when no native male voice is found,
            // we MUST utilize a local (offline) voice, which fully respects pitch adjustments.
            chosenVoice = matchingLocaleVoices.find(v => v.localService)
              || matchingLocaleVoices.find(v => !v.name.includes("Google") && !v.name.includes("Natural"))
              || matchingLocaleVoices[0]
              || null;
          }
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
          // Double check if the chosen fallback voice actually matches a male keyword
          const nameLower = chosenVoice.name.toLowerCase();
          if (maleKeywords.some(kw => nameLower.includes(kw))) {
            isActuallyMale = true;
          }
        }
      }

      // Check if chosen voice is an online Google cloud voice, as extreme pitch values can sometimes make it stutter or crack.
      const isGoogleOrNetworkVoice = chosenVoice ? (chosenVoice.name.includes("Google") || !chosenVoice.localService) : true;

      // Set highly clear and natural pitches to guarantee stability and prevent any speech codec cracking
      if (activeGender === 'female') {
        utterance.pitch = isGoogleOrNetworkVoice ? 1.05 : 1.12; // Natural and bright female timbre without distortion
        utterance.rate = 1.0;
      } else {
        // Create an extremely deep, thick cave-like bass register mimicking Forestella's Ko Woo-rim
        // We slightly reduce speech rate to 0.90 to convey greater charisma, weight and gravity.
        utterance.rate = 0.90;
        
        if (isActuallyMale) {
          // Pitch down native male voices significantly to simulate a deep bass singer
          utterance.pitch = isGoogleOrNetworkVoice ? 0.58 : 0.53;
        } else {
          // Pitch down fallback synthesized voices to the absolute floor of the Synthesis API (0.50)
          // This outputs a very heavy, low-frequency, deep-resonating bass resonance
          utterance.pitch = isGoogleOrNetworkVoice ? 0.50 : 0.50;
        }
      }

      // Speak immediately to preserve browser user-gesture context.
      // A setTimeout would break the gesture chain after async fetch and cause browsers to block TTS.
      // If voices haven't loaded yet, retry once via the voiceschanged event.
      if (voices.length === 0) {
        const onVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          window.speechSynthesis.speak(utterance);
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
        // Fallback: speak anyway after 300ms in case voiceschanged never fires
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          if (!window.speechSynthesis.speaking) {
            window.speechSynthesis.speak(utterance);
          }
        }, 300);
      } else {
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("TTS audio playback error", err);
    }
  };

  // Start Browser Web Speech API Recognition
  const startBrowserSpeechRecognition = (lang: 'ko' | 'ja', mode: 'single' | 'dialogue') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any active recognition session first to prevent microphone resource locking
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang === 'ko' ? 'ko-KR' : 'ja-JP';
    rec.maxAlternatives = 3; // Request multiple alternatives and pick highest confidence

    const clearSpeechTimeout = () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
    };

    rec.onspeechstart = () => clearSpeechTimeout();
    rec.onsoundstart = () => clearSpeechTimeout();

    rec.onstart = () => {
      speechRecognizedRef.current = false;
      // Auto-timeout: stop after 8s of no result to prevent hanging
      clearSpeechTimeout();
      speechTimeoutRef.current = setTimeout(() => {
        try { rec.stop(); } catch (err) {}
      }, 8000);

      if (mode === 'dialogue') {
        setDialogueIsListening(lang);
        setDialogueSpeechError(null);
      } else {
        setIsListening(true);
        setSpeechError(null);
      }
    };

    rec.onresult = (event: any) => {
      clearSpeechTimeout();

      // Pick the alternative with the highest confidence score
      let bestTranscript = '';
      let bestConfidence = -1;
      const results = event.results[0];
      for (let i = 0; i < results.length; i++) {
        if (results[i].confidence > bestConfidence) {
          bestConfidence = results[i].confidence;
          bestTranscript = results[i].transcript;
        }
      }

      if (bestTranscript) {
        speechRecognizedRef.current = true;
        if (mode === 'dialogue') {
          handleDialogueSpeechResultRef.current?.(bestTranscript, lang);
        } else {
          setSourceText(bestTranscript);
          handleTranslateRef.current?.(bestTranscript);
        }
      }
    };

    rec.onerror = (e: any) => {
      clearSpeechTimeout();
      setIsListening(false);
      setDialogueIsListening('none');

      let errMsg = "음성 인식 중 오류가 발생했습니다.";
      if (e.error === 'no-speech') errMsg = "음성을 감지하지 못했습니다. 다시 시도해 주세요.";
      else if (e.error === 'not-allowed') errMsg = "마이크 권한이 거부되었습니다. 설정에서 승인해 주세요.";
      else if (e.error === 'network') errMsg = "네트워크 오류로 음성 인식에 실패했습니다.";

      if (mode === 'dialogue') setDialogueSpeechError({ lang, message: errMsg });
      else setSpeechError(errMsg);
    };

    rec.onend = () => {
      clearSpeechTimeout();
      setIsListening(false);
      setDialogueIsListening('none');

      if (!speechRecognizedRef.current) {
        const errMsg = "인식된 말이 없습니다. 다시 말씀해 주세요.";
        if (mode === 'dialogue') setDialogueSpeechError(prev => prev ? prev : { lang, message: errMsg });
        else setSpeechError(prev => prev ? prev : errMsg);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;

    } catch (e) {
      console.error("Failed to start speech recognition", e);
    }
  };

  // Start recording audio for Gemini STT
  const startRecording = async (lang: 'ko' | 'ja', mode: 'single' | 'dialogue') => {
    // Check if API Key is configured before starting recording
    const hasKey = userApiKey.trim() || hasServerApiKey;
    if (!hasKey) {
      const errMsg = "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.";
      if (mode === 'single') setSpeechError(errMsg);
      else setDialogueSpeechError({ lang, message: errMsg });
      return;
    }

    try {
      // Cancel active TTS output to prevent overlapping audio feedback
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

      setIsPreparingVoice(true);

      // Request microphone with audio processing constraints for cleaner voice capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for speech recognition
        }
      });
      audioChunksRef.current = [];

      if (typeof MediaRecorder === 'undefined') {
        throw new Error("이 브라우저는 MediaRecorder API를 지원하지 않습니다.");
      }

      // Determine supported mimeType for recording
      let mimeType = 'audio/webm';
      for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac']) {
        if (MediaRecorder.isTypeSupported(type)) { mimeType = type; break; }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        // 32kbps is sufficient for speech-quality STT and keeps payloads
        // well under Vercel's 4.5MB request body limit for audio recordings.
        audioBitsPerSecond: 32000
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Release microphone tracks immediately
        stream.getTracks().forEach(track => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });

        if (audioBlob.size < 500) {
          const errMsg = "음성이 너무 짧습니다. 다시 말씀해 주세요.";
          if (mode === 'single') setSpeechError(errMsg);
          else setDialogueSpeechError({ lang, message: errMsg });
          return;
        }

        // Set processing state before async work
        if (mode === 'single') { setIsTranslating(true); setSpeechError(null); }
        else { setDialogueIsTranslating(true); setDialogueSpeechError(null); }

        try {
          // Convert blob to base64 using promise wrapper
          const base64Content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
          });

          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audio: base64Content,
              mimeType: mediaRecorder.mimeType || 'audio/webm',
              language: lang,
              apiKey: userApiKey
            })
          });

          if (!response.ok) {
            let errorMsg = "음성 인식 실패";
            try {
              const parsed = await response.json();
              errorMsg = parsed?.message || parsed?.error || errorMsg;
            } catch (e) {
              if (response.status === 500 && !userApiKey.trim() && !hasServerApiKey) {
                errorMsg = "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.";
              } else {
                errorMsg = `서버 오류 (${response.status}): 음성 인식 요청을 처리할 수 없습니다.`;
              }
            }
            throw new Error(errorMsg);
          }

          const parsed = await response.json();
          const transcribedText = (parsed.text || "").trim();
          if (!transcribedText) throw new Error("음성을 감지하지 못했습니다. 다시 말씀해 주세요.");

          if (mode === 'single') {
            setSourceText(transcribedText);
            handleTranslateRef.current?.(transcribedText);
          } else {
            handleDialogueSpeechResultRef.current?.(transcribedText, lang);
          }
        } catch (err: any) {
          console.error("Gemini STT error:", err);
          const errMsg = err.message || "음성 인식 실패";
          if (mode === 'single') setSpeechError(errMsg);
          else setDialogueSpeechError({ lang, message: errMsg });
        } finally {
          if (mode === 'single') setIsTranslating(false);
          else setDialogueIsTranslating(false);
        }
      };

      if (mode === 'single') { setIsListening(true); setSpeechError(null); }
      else { setDialogueIsListening(lang); setDialogueSpeechError(null); }

      // Use timeslice=250ms to collect audio chunks incrementally, preventing data loss
      mediaRecorder.start(250);

      // Warm up: wait 300ms before showing "말하세요" indicator so user's first word is captured
      setTimeout(() => setIsPreparingVoice(false), 300);

      // Auto stop after 15 seconds to prevent resource leakage
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          if (mode === 'single') setIsListening(false);
          else setDialogueIsListening('none');
        }
        setIsPreparingVoice(false);
      }, 15000);

    } catch (err: any) {
      console.error("Failed to start MediaRecorder:", err);
      setIsPreparingVoice(false);
      const errMsg = "마이크 접근 권한을 허용해 주세요.";
      if (mode === 'single') setSpeechError(errMsg);
      else setDialogueSpeechError({ lang, message: errMsg });
    }
  };


  // Stop recording audio
  const stopRecording = (mode: 'single' | 'dialogue') => {
    setIsPreparingVoice(false);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (mode === 'single') {
      setIsListening(false);
    } else {
      setDialogueIsListening('none');
    }
  };

  // Sound recognition execution
  const toggleListening = () => {
    if (sttMode === 'ai') {
      if (isListening) {
        stopRecording('single');
      } else {
        setSourceText("");
        setTranslatedResult(null);
        startRecording(sourceLang, 'single');
      }
    } else {
      // Browser Web Speech API
      if (!voiceSupport) {
        alert("말하기 기능(STT)이 비활성화되어 있거나 이 기기 브라우저에서 사용할 수 없습니다.");
        return;
      }

      setSpeechError(null);
      if (isListening) {
        recognitionRef.current?.stop();
      } else {
        setSourceText("");
        setTranslatedResult(null);
        startBrowserSpeechRecognition(sourceLang, 'single');
      }
    }
  };

  // Dialogue Mode speech processing
  const handleDialogueSpeechResult = async (cleanText: string, lang: 'ko' | 'ja') => {
    const trimmed = cleanText.trim();
    if (!trimmed) return;

    // Check if API Key is configured before sending request
    const hasKey = userApiKey.trim() || hasServerApiKey;
    if (!hasKey) {
      setApiError({
        type: 'error',
        message: "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요."
      });
      if (lang === 'ko') {
        setDialogueKoText(trimmed);
        setDialogueJaText("제미나이 키 미입력했습니다.");
      } else {
        setDialogueJaText(trimmed);
        setDialogueKoText("제미나이 키 미입력했습니다.");
      }
      return;
    }

    const source = lang;
    const target = lang === 'ko' ? 'ja' : 'ko';

    // Check cache first to minimize wait time for repeated phrases
    const cacheKey = `${source}:${target}:${trimmed}`;
    const cached = getCachedTranslation(cacheKey);
    if (cached) {
      if (lang === 'ko') {
        setDialogueKoText(trimmed);
        setDialogueJaText(cached.translatedText);
        if (audioPlayMode === 'auto') handlePlayTTS(cached.translatedText, 'ja');
      } else {
        setDialogueJaText(trimmed);
        setDialogueKoText(cached.translatedText);
        if (audioPlayMode === 'auto') handlePlayTTS(cached.translatedText, 'ko');
      }

      // Update history/feed
      const dialogueMessage: ConversationMessage = {
        id: "msg-cache-dialogue-" + Date.now(),
        text: trimmed,
        translatedText: cached.translatedText,
        sender: lang === 'ko' ? 'user' : 'partner',
        lang: lang,
        pronunciation: cached.pronunciation,
        furigana: cached.furigana,
        timestamp: Date.now()
      };
      saveDialogueFeed(prev => [dialogueMessage, ...prev].slice(0, 25));
      saveHistory(prev => [{
        id: "hist-dialogue-cache-" + Date.now(),
        sourceText: trimmed,
        translatedText: cached.translatedText,
        sourceLang: source,
        targetLang: target,
        pronunciation: cached.pronunciation,
        furigana: cached.furigana,
        explanation: cached.explanation,
        timestamp: Date.now(),
        isFavorite: false
      }, ...prev]);

      return;
    }

    setDialogueIsTranslating(true);
    setApiError(null);

    if (lang === 'ko') {
      setDialogueKoText(trimmed);
      setDialogueJaText("번역 중...");
    } else {
      setDialogueJaText(trimmed);
      setDialogueKoText("번역 중...");
    }

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          sourceLang: source,
          targetLang: target,
          apiKey: userApiKey
        })
      });

      if (!response.ok) {
        let errorMsg = "서버 혹은 API 통신 실패";
        try {
          const errBody = await response.json();
          errorMsg = errBody.message || errBody.error || errorMsg;
        } catch (e) {
          if (response.status === 500 && !userApiKey.trim() && !hasServerApiKey) {
            errorMsg = "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.";
          } else {
            errorMsg = `서버 오류 (${response.status}): 요청을 처리할 수 없습니다.`;
          }
        }
        throw new Error(errorMsg);
      }

      const data: TranslationResult = await response.json();

      if (lang === 'ko') {
        setDialogueJaText(data.translatedText);
        // Auto TTS if enabled
        if (audioPlayMode === 'auto') {
          handlePlayTTS(data.translatedText, 'ja');
        }
      } else {
        setDialogueKoText(data.translatedText);
        // Auto TTS if enabled
        if (audioPlayMode === 'auto') {
          handlePlayTTS(data.translatedText, 'ko');
        }
      }

      // Add to translation history record as well
      const newHistoryItem: HistoryItem = {
        id: "hist-dialogue-" + Date.now(),
        sourceText: trimmed,
        translatedText: data.translatedText,
        sourceLang: source,
        targetLang: target,
        pronunciation: data.pronunciation,
        furigana: data.furigana,
        explanation: data.explanation,
        timestamp: Date.now(),
        isFavorite: false
      };

      saveHistory(prev => [newHistoryItem, ...prev]);

      // Add to dialogue real-time conversation stream as well
      const dialogueMessage: ConversationMessage = {
        id: "msg-dialogue-" + Date.now(),
        text: trimmed,
        translatedText: data.translatedText,
        sender: lang === 'ko' ? 'user' : 'partner',
        lang: lang,
        pronunciation: data.pronunciation,
        furigana: data.furigana,
        timestamp: Date.now()
      };
      saveDialogueFeed(prev => [dialogueMessage, ...prev].slice(0, 25));

    } catch (err: any) {
      console.error("Dialogue translation failure", err);
      if (lang === 'ko') {
        setDialogueJaText("번역 오류가 발생했습니다.");
      } else {
        setDialogueKoText("번역 오류가 발생했습니다.");
      }
      setApiError({
        type: 'error',
        message: err.message || "대화 번역을 완료할 수 없습니다. 인터넷 상태를 점검해 주세요."
      });
    } finally {
      setDialogueIsTranslating(false);
    }
  };

  // Update speech result callback ref on every render to avoid stale closure state captures
  useEffect(() => {
    handleDialogueSpeechResultRef.current = handleDialogueSpeechResult;
    handleTranslateRef.current = handleTranslate;
  });

  const toggleDialogueListening = (lang: 'ko' | 'ja') => {
    setDialogueSpeechError(null);
    // Cancel active TTS output to prevent overlapping audio feedback
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    if (sttMode === 'ai') {
      if (dialogueIsListening !== 'none') {
        stopRecording('dialogue');
      } else {
        if (lang === 'ko') {
          setDialogueKoText("");
        } else {
          setDialogueJaText("");
        }
        startRecording(lang, 'dialogue');
      }
    } else {
      // Browser Web Speech API
      if (!voiceSupport) {
        alert("말하기 기능(STT)이 비활성화되어 있거나 이 기기 브라우저에서 사용할 수 없습니다.");
        return;
      }

      if (dialogueIsListening !== 'none') {
        recognitionRef.current?.stop();
      } else {
        if (lang === 'ko') {
          setDialogueKoText("");
        } else {
          setDialogueJaText("");
        }
        startBrowserSpeechRecognition(lang, 'dialogue');
      }
    }
  };

  // Card Copying helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Bookmark or favorite item toggle
  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = historyItems.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    saveHistory(updated);
  };

  // Delete unique history row
  const deleteHistoryRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = confirm("이 번역 기록을 영구 삭제하시겠습니까?");
    if (confirmed) {
      const updated = historyItems.filter(item => item.id !== id);
      saveHistory(updated);
    }
  };

  // Clear entire history catalog
  const clearAllHistory = () => {
    const confirmed = confirm("모든 번역 저장 내역을 비우시겠습니까? (되돌릴 수 없습니다)");
    if (confirmed) {
      saveHistory([]);
    }
  };

  // Handle Photo input select & read base64 image representation
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("이미지 파일만 선택 가능합니다. (restaurant menu, street sign, warning sticker, etc)");
      return;
    }

    // Limit to under 12MB for safety
    if (file.size > 12 * 1024 * 1024) {
      setImageError("사진 파일이 너무 큽니다. 12MB 이하의 다른 정밀한 사진을 올려주세요.");
      return;
    }

    setImageError(null);
    setImageResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Send selected image base64 directly to multimodal endpoint
  const handleAnalyzeImage = async () => {
    if (!imagePreview) return;

    // Check if API Key is configured before sending request
    const hasKey = userApiKey.trim() || hasServerApiKey;
    if (!hasKey) {
      setImageError("제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.");
      return;
    }

    setIsAnalyzingImage(true);
    setImageError(null);

    try {
      const response = await fetch("/api/translate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imagePreview,
          targetLang: 'ko', // Typically translating local Japanese signs to Korean
          apiKey: userApiKey
        })
      });

      if (!response.ok) {
        let errorMsg = "이미지 OCR 번역 분석에 실패했습니다.";
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch (e) {
          if (response.status === 500 && !userApiKey.trim() && !hasServerApiKey) {
            errorMsg = "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.";
          } else {
            errorMsg = `서버 오류 (${response.status}): 이미지 분석 요청을 처리할 수 없습니다.`;
          }
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      setImageResult(result);
    } catch (err: any) {
      console.error("Camera OCR client failed", err);
      setImageError(err.message || "이미지를 요약하고 분석하는 동안 네트워크 지연이나 에러가 발생했습니다. 개발자 Secrets 설정의 API Key를 체크해 주세요.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Clear OCR workspace state
  const resetImageWorkspace = () => {
    setImagePreview(null);
    setImageResult(null);
    setImageError(null);
  };

  // Live Camera stream controllers
  const startLiveCamera = async () => {
    setLiveCameraError(null);
    setLiveImageResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.error("Error playing video stream:", e));
      }
      setIsLiveCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed", err);
      setLiveCameraError("카메라를 시작할 수 없습니다. 카메라 접근 권한을 허용했는지, 혹은 보안 연결(HTTPS)인지 확인해 주십시오.");
    }
  };

  const stopLiveCamera = () => {
    setIsLiveCameraActive(false);
    setIsAutoScanActive(false);
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureAndAnalyzeLiveFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzingLiveFrame) return;

    // Check if API Key is configured before sending request
    const hasKey = userApiKey.trim() || hasServerApiKey;
    if (!hasKey) {
      setLiveCameraError("제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    // Set canvas dimensions based on live video feed dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame on canvas context
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Capture standard compressed dataURL quality to preserve payload speed
    const base64Frame = canvas.toDataURL("image/jpeg", 0.75);

    setIsAnalyzingLiveFrame(true);
    setLiveCameraError(null);

    try {
      const response = await fetch("/api/translate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Frame,
          targetLang: 'ko',
          apiKey: userApiKey
        })
      });

      if (!response.ok) {
        let errorMsg = "실시간 촬영 번역에 실패했습니다.";
        if (response.status === 500 && !userApiKey.trim() && !hasServerApiKey) {
          errorMsg = "제미나이 키 미입력했습니다. 설정에서 API 키를 입력해주세요.";
        } else {
          errorMsg = `서버 오류 (${response.status}): 실시간 촬영 번역에 실패했습니다.`;
        }
        throw new Error(errorMsg);
      }

      const result = await response.json();
      setLiveImageResult(result);
    } catch (err: any) {
      console.error("Live camera translation API failure", err);
      setLiveCameraError("실시간 분석 도중 오류가 발생했습니다. 카메라 앵글이 고정되고 글자가 선명할 수 있도록 유지해 주세요.");
    } finally {
      setIsAnalyzingLiveFrame(false);
    }
  };

  // Monitor auto scroll-free intervals
  useEffect(() => {
    if (isLiveCameraActive && isAutoScanActive) {
      autoScanTimerRef.current = setInterval(() => {
        captureAndAnalyzeLiveFrame();
      }, 5000); // 5 seconds
    } else {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    }

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [isLiveCameraActive, isAutoScanActive, isAnalyzingLiveFrame]);

  // Handle activeTab changes
  useEffect(() => {
    if (activeTab !== 'camera') {
      stopLiveCamera();
    }
  }, [activeTab]);

  // Clean unmounted components
  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  // Setup sample preset translation
  const loadPresetTranslation = (original: string, translation: string, pronunciation: string) => {
    setActiveTab('translate');
    setSourceText(original);
    setTranslatedResult({
      translatedText: translation,
      pronunciation: pronunciation,
      explanation: "일상 필수 표현 가이드에서 훈련한 여행 표현입니다."
    });
  };

  // Category filter for the phrasebook
  const activePhraseCategory = TRAVEL_PHRASE_CATEGORIES.find(cat => cat.id === selectedCategory);
  
  // Filtered phrase listings by search input text
  const filteredPhrases = activePhraseCategory?.phrases.filter(p => 
    p.korean.toLowerCase().includes(phraseSearch.toLowerCase()) ||
    p.japanese.toLowerCase().includes(phraseSearch.toLowerCase()) ||
    p.pronunciation.toLowerCase().includes(phraseSearch.toLowerCase())
  ) || [];

  return (
    <div id="translator-app" className="min-h-screen flex flex-col max-w-lg mx-auto bg-stone-50 border-x border-stone-200 shadow-xl overflow-hidden">
      
      {/* 🚀 Header & Branding - Compact header with JP TRIP badge */}
      <header id="app-header" className="bg-[#1c1917] text-[#f5f5f4] py-2.5 px-4 select-none border-b border-stone-800 flex items-center justify-center gap-2">
        <span className="bg-[#dc2626] text-white text-[9px] tracking-widest font-bold px-1.5 py-0.5 rounded-sm">
          JP TRIP
        </span>
        <h1 className="text-sm font-semibold tracking-tight">
          한일 실시간 통번역기
        </h1>
      </header>

      {/* 💡 Secret Key Alert Handler */}
      {apiError && (
        <div id="api-alert" className="bg-red-50 border-y border-red-200 px-4 py-3 text-xs text-red-800 flex gap-2 item-start">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">번역기 서비스 알림</span>
            <p>{apiError.message}</p>
          </div>
        </div>
      )}

      {/* 🎯 Real-time Navigation Tabs Hub */}
      <nav id="app-navigation" className="bg-white border-b border-stone-200 grid grid-cols-5 select-none">
        <button
          id="btn-nav-translate"
          onClick={() => setActiveTab('translate')}
          className={`py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all border-b-2 text-[10.5px] font-semibold ${
            activeTab === 'translate' 
              ? 'border-[#dc2626] text-[#dc2626] bg-stone-50/50 font-bold' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Languages className="w-4 h-4" />
          <span>번역</span>
        </button>
        <button
          id="btn-nav-dialogue"
          onClick={() => {
            setActiveTab('dialogue');
            // Stop any active TTS
            if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
          }}
          className={`py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all border-b-2 text-[10.5px] font-semibold ${
            activeTab === 'dialogue' 
              ? 'border-[#dc2626] text-[#dc2626] bg-stone-50/50 font-bold' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>대화</span>
        </button>
        <button
          id="btn-nav-camera"
          onClick={() => setActiveTab('camera')}
          className={`py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all border-b-2 text-[10.5px] font-semibold ${
            activeTab === 'camera' 
              ? 'border-[#dc2626] text-[#dc2626] bg-stone-50/50 font-bold' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>간판·메뉴</span>
        </button>
        <button
          id="btn-nav-phrasebook"
          onClick={() => setActiveTab('phrasebook')}
          className={`py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all border-b-2 text-[10.5px] font-semibold ${
            activeTab === 'phrasebook' 
              ? 'border-[#dc2626] text-[#dc2626] bg-stone-50/50 font-bold' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>간편 회화</span>
        </button>
        <button
          id="btn-nav-history"
          onClick={() => setActiveTab('history')}
          className={`py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all border-b-2 text-[10.5px] font-semibold ${
            activeTab === 'history' 
              ? 'border-[#dc2626] text-[#dc2626] bg-stone-50/50 font-bold' 
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>기록</span>
        </button>
      </nav>

      {/* 🔮 Active Interface Body */}
      <main id="app-main" className="flex-1 overflow-y-auto p-4 flex flex-col bg-[#fbfbfa]">
        
        {/* TAB 1: Real-time Dialog & Translation Engine */}
        {activeTab === 'translate' && (
          <div id="tab-translate-content" className="flex flex-col gap-4 flex-1">
            
            {/* Lang switcher panel */}
            <div className="bg-white p-2.5 rounded-xl border border-stone-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 font-semibold text-stone-800 text-sm">
                <span className={sourceLang === 'ko' ? 'text-[#dc2626]' : 'text-stone-600'}>
                  {sourceLang === 'ko' ? "한국어" : "일본어"}
                </span>
              </div>
              
              <button
                id="btn-swap-langs"
                onClick={handleSwapLanguages}
                className="p-1.5 px-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors flex items-center justify-center"
                title="언어 방향 전환"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              
              <div className="flex items-center gap-2 px-3 font-semibold text-stone-800 text-sm">
                <span className={targetLang === 'ja' ? 'text-[#dc2626]' : 'text-stone-600'}>
                  {targetLang === 'ja' ? "일본어" : "한국어"}
                </span>
              </div>
            </div>

            {/* ⚙️ 통역 및 음성 설정 컨테이너 (Toggle) */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden transition-all duration-200">
              <button
                id="btn-toggle-settings"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="w-full flex items-center justify-between py-1.5 px-3 bg-stone-50 hover:bg-stone-100/80 transition-colors text-stone-700 select-none text-[11px] font-bold"
              >
                <div className="flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-stone-500 animate-[spin_10s_linear_infinite]" />
                  <span className="text-xs font-bold text-stone-800">설정</span>
                </div>
                <div className="flex items-center gap-1 text-stone-400">
                  <span className="text-[10px] font-medium">
                    {isSettingsOpen ? "접기" : "열기"}
                  </span>
                  {isSettingsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {isSettingsOpen && (
                <div className="p-2 bg-white flex flex-col gap-1.5 transition-all duration-300">
                  {/* API Key Input Section */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 ml-1">
                      <Settings className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-[11px] font-semibold text-stone-700">제미나이 API 키 입력</span>
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="password"
                        id="input-api-key"
                        value={userApiKey}
                        onChange={(e) => setUserApiKey(e.target.value)}
                        placeholder="API 키를 입력하세요"
                        className="flex-1 text-[10.5px] px-2 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] bg-stone-50"
                      />
                      <button
                        id="btn-save-api-key"
                        onClick={() => handleSaveApiKey(userApiKey)}
                        className="px-3 py-1.5 bg-[#dc2626] text-white text-[10.5px] font-bold rounded-md hover:bg-red-700 transition-colors"
                      >
                        저장
                      </button>
                      <button
                        id="btn-clear-api-key"
                        onClick={() => {
                          setUserApiKey("");
                          localStorage.removeItem("japan_travel_user_api_key");
                          alert("API 키가 삭제되었습니다.");
                        }}
                        className="px-2 py-1.5 bg-stone-200 text-stone-600 text-[10.5px] font-bold rounded-md hover:bg-stone-300 transition-colors"
                        title="API 키 삭제"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[9px] text-stone-500 ml-1">
                      Google AI Studio에서 무료 API 키를 발급받을 수 있습니다.
                    </p>
                  </div>

                  {/* STT Mode Toggle Section */}
                  <div className="flex flex-col gap-1.5 border-t border-stone-100 pt-2 mt-1">
                    <div className="flex items-center gap-1 ml-1">
                      <Mic className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-[11px] font-semibold text-stone-700">음성 인식 모드</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setSttMode('browser');
                          localStorage.setItem("japan_travel_stt_mode", "browser");
                        }}
                        className={`py-1.5 rounded-md text-[10.5px] font-bold transition-all ${
                          sttMode === 'browser'
                            ? 'bg-white text-stone-850 shadow-sm'
                            : 'text-stone-550 hover:text-stone-800'
                        }`}
                      >
                        기본 브라우저
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSttMode('ai');
                          localStorage.setItem("japan_travel_stt_mode", "ai");
                        }}
                        className={`py-1.5 rounded-md text-[10.5px] font-bold transition-all flex items-center justify-center gap-1 ${
                          sttMode === 'ai'
                            ? 'bg-[#1c1917] text-[#f5f5f4] shadow-sm'
                            : 'text-stone-550 hover:text-stone-800'
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-red-500" />
                        <span>고정밀 AI (Gemini)</span>
                      </button>
                    </div>
                  </div>

                  {/* Audio Play Mode & Voice Gender */}
                  <div className="flex flex-col gap-2 border-t border-stone-100 pt-2 mt-1">
                    <div className="flex items-center gap-1 ml-1">
                      <Volume2 className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-[11px] font-semibold text-stone-700">TTS 재생 설정</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                      {(['auto', 'manual'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setAudioPlayMode(mode);
                            localStorage.setItem("japan_travel_audio_mode", mode);
                          }}
                          className={`py-1.5 rounded-md text-[10.5px] font-bold transition-all ${
                            audioPlayMode === mode ? 'bg-white text-stone-850 shadow-sm' : 'text-stone-550 hover:text-stone-800'
                          }`}
                        >
                          {mode === 'auto' ? '🔊 자동 재생' : '🔇 수동 재생'}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                      {(['female', 'male'] as const).map(gender => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => {
                            setVoiceGender(gender);
                            localStorage.setItem("japan_travel_voice_gender", gender);
                          }}
                          className={`py-1.5 rounded-md text-[10.5px] font-bold transition-all ${
                            voiceGender === gender ? 'bg-white text-stone-850 shadow-sm' : 'text-stone-550 hover:text-stone-800'
                          }`}
                        >
                          {gender === 'female' ? '👩 여성 음성' : '👨 남성 음성'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input card for translation */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 relative flex flex-col focus-within:ring-1 focus-within:ring-stone-400 focus-within:border-stone-400">
              {speechError && (
                <div className="bg-red-50 text-red-750 text-[10px] font-medium py-1 px-2 rounded-lg border border-red-150 flex items-center justify-between mb-2 gap-1.5 animate-fadeIn max-w-max self-start shadow-sm">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-650 shrink-0" />
                    <span>{speechError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpeechError(null)}
                    className="text-stone-400 hover:text-stone-700 text-[10px] pl-1.5 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {isListening && (
                <div className="absolute top-3 left-3 right-3 py-2 px-3 bg-red-50/95 border border-red-200 shadow-sm rounded-xl flex items-center justify-between animate-fadeIn z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-1">
                    {isPreparingVoice ? (
                      <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-red-600 rounded-full animate-spin shrink-0"></div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <span className="w-0.5 h-3 bg-red-500 rounded-full animate-soundwave1 origin-center"></span>
                        <span className="w-0.5 h-3 bg-red-500 rounded-full animate-soundwave2 origin-center"></span>
                        <span className="w-0.5 h-3 bg-red-500 rounded-full animate-soundwave3 origin-center"></span>
                        <span className="w-0.5 h-3 bg-red-500 rounded-full animate-soundwave4 origin-center"></span>
                        <span className="w-0.5 h-3 bg-red-500 rounded-full animate-soundwave5 origin-center"></span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10.5px] font-bold text-red-600 flex items-center gap-1 flex-1 justify-center">
                    <Mic className={`w-3 h-3 text-red-500 shrink-0 ${isPreparingVoice ? 'opacity-50' : 'animate-pulse'}`} />
                    <span>{isPreparingVoice ? "마이크 준비 중..." : "듣는 중... 말씀해 주세요"}</span>
                  </p>
                  <button
                    type="button"
                    onClick={toggleListening}
                    className="text-[9px] font-black text-red-500 bg-red-100 hover:bg-red-200 border border-red-200 rounded-md px-1.5 py-0.5 whitespace-nowrap transition-colors"
                    title="클릭하면 정지하고 즉시 번역"
                  >
                    클릭시 정지
                  </button>
                </div>
              )}

              <label className="text-[10px] text-stone-400 uppercase tracking-widest font-black block mb-1">
                번역할 문장을 입력하세요 (인풋)
              </label>
              <textarea
                id="input-translate-text"
                rows={3}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={
                  isListening
                    ? ""
                    : sourceLang === 'ko' 
                      ? "여기에 한국어 문장이나 질문을 적어주세요...\n예) 이 근처에서 타코야키가 맛있는 식당이 어디인가요?" 
                      : "일본어 문장을 입력해 주세요...\n예) お会計をお願いします。"
                }
                className="w-full bg-transparent border-0 resize-none text-stone-800 text-base font-medium placeholder-stone-400 focus:outline-none focus:ring-0 leading-relaxed"
              />
              
              <div className="border-t border-stone-100 pt-3 mt-2">
                <div className="grid grid-cols-4 gap-2 w-full">
                  <div className="flex flex-col items-center gap-1">
                    <button
                      id="btn-voice-input"
                      type="button"
                      onClick={toggleListening}
                      className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-1 transition-all text-xs font-semibold shadow-sm border ${
                        isListening 
                          ? 'bg-red-500 text-white border-red-500' 
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                      }`}
                      title={isListening ? "클릭하면 정지하고 즉시 번역합니다" : "말하기로 입력"}
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isListening ? "듣는중" : "말하기"}</span>
                    </button>
                    {isListening && (
                      <span className="text-[9px] font-bold text-red-500 animate-pulse whitespace-nowrap leading-none">
                        클릭시 정지·번역
                      </span>
                    )}
                  </div>

                  <button
                    id="btn-dialogue-shortcut"
                    type="button"
                    onClick={() => {
                      setActiveTab('dialogue');
                      // Stop any active TTS
                      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                    }}
                    className="w-full py-2.5 rounded-lg flex items-center justify-center gap-1 transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-sm"
                    title="대화(양방향 통역) 모드 바로가기"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>대화</span>
                  </button>

                  <button
                    id="btn-clear-text"
                    type="button"
                    disabled={!sourceText}
                    className="w-full py-2.5 rounded-lg flex items-center justify-center gap-1 transition-all bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 text-xs font-semibold shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                    onClick={() => { setSourceText(""); setTranslatedResult(null); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>지우기</span>
                  </button>

                  <button
                    id="btn-submit-translate"
                    type="button"
                    onClick={() => handleTranslate()}
                    disabled={isTranslating || !sourceText.trim()}
                    className="w-full py-2.5 rounded-lg bg-[#1c1917] text-[#f5f5f4] hover:bg-stone-800 border border-transparent disabled:bg-stone-100 disabled:text-stone-300 disabled:border-stone-100 font-semibold text-xs transition-all flex items-center justify-center gap-1 shadow-sm"
                  >
                    {isTranslating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-stone-400 border-t-white rounded-full animate-spin"></div>
                        <span>번역 중</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-stone-300" />
                        <span>번역</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Translation outputs showcase */}
            {translatedResult ? (
              <div id="translation-result" className="bg-white rounded-xl border-l-4 border-l-[#dc2626] border-stone-200 border-y border-r shadow-md p-5 flex flex-col gap-4 animate-fadeIn">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-black block mb-0.5">
                      번역 결과 (아웃풋)
                    </span>
                    <h3 className="text-xl font-bold text-stone-900 leading-snug">
                      {translatedResult.translatedText}
                    </h3>

                    {/* Furigana Display block */}
                    {translatedResult.furigana && (
                      <div className="mt-2 text-stone-600 text-xs tracking-wide bg-stone-50 p-2 rounded border border-stone-100">
                        <span className="text-[9px] text-[#dc2626] font-extrabold uppercase tracking-wider block mb-0.5">한자 요미가나 가이드 (Furigana)</span>
                        {translatedResult.furigana}
                      </div>
                    )}

                    {/* Sound pronunciation readout guide in phonetic korean */}
                    {translatedResult.pronunciation && (
                      <p className="mt-1.5 text-sm font-semibold text-stone-700 italic">
                        [발음] {translatedResult.pronunciation}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      id="btn-tts-translated"
                      onClick={() => handlePlayTTS(translatedResult.translatedText, targetLang)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                      title="소리내어 음성 듣기"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      id="btn-copy-translated"
                      onClick={() => handleCopyText(translatedResult.translatedText)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors"
                      title="복사하기"
                    >
                      {copiedText ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>


              </div>
            ) : (
              !isTranslating && (
                <div className="border border-dashed border-stone-300 rounded-xl p-8 text-center flex flex-col items-center justify-center text-stone-400 gap-2 select-none">
                  <Compass className="w-10 h-10 text-stone-300 stroke-1" />
                  <p className="text-xs">실시간 음성을 전송하거나 문장을 입력하여 번역해 보세요.</p>
                  <p className="text-[10px] text-stone-400 max-w-xs mt-1">한문을 몰라도 요미가나 발음 기호 및 현지의 뉘앙스를 함께 상세 가이드해 드립니다.</p>
                </div>
              )
            )}

            {/* Conversation log panel (Simulates a dynamic split dialogue) */}
            {(translateFeed.length > 0 || dialogueFeed.length > 0) && (
              <div id="conversation-history-log" className="mt-4 flex flex-col gap-2 bg-white rounded-xl border border-stone-200 p-3.5 shadow-sm">
                
                {/* Selection Buttons & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-stone-100">
                  <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200 select-none">
                    <button
                      id="btn-feed-tab-translate"
                      type="button"
                      onClick={() => setActiveFeedTab('translate')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeFeedTab === 'translate'
                          ? 'bg-[#1c1917] text-[#f5f5f4] shadow-sm'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>말하기 번역 ({translateFeed.length})</span>
                    </button>
                    <button
                      id="btn-feed-tab-dialogue"
                      type="button"
                      onClick={() => setActiveFeedTab('dialogue')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeFeedTab === 'dialogue'
                          ? 'bg-[#1c1917] text-[#f5f5f4] shadow-sm'
                          : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>양방향 대화 ({dialogueFeed.length})</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-[10px] text-[#dc2626] font-extrabold tracking-wider uppercase">
                      실시간 대화 피드 (최근)
                    </span>
                    <button
                      id="btn-clear-conversation"
                      type="button"
                      className="text-[10px] text-stone-400 hover:text-red-600 font-bold border border-stone-200 hover:border-red-100 rounded px-2 py-0.5 transition-colors bg-stone-50 hover:bg-red-50"
                      onClick={() => {
                        if (activeFeedTab === 'translate') {
                          saveTranslateFeed([]);
                        } else {
                          saveDialogueFeed([]);
                        }
                      }}
                    >
                      기록 지우기
                    </button>
                  </div>
                </div>

                {/* Feed Items */}
                <div className="bg-stone-50/50 rounded-lg p-2 max-h-[190px] overflow-y-auto flex flex-col gap-2 mt-1">
                  {((activeFeedTab === 'translate' ? translateFeed : dialogueFeed).length > 0) ? (
                    (activeFeedTab === 'translate' ? translateFeed : dialogueFeed).map((msg) => (
                      <div 
                        key={msg.id}
                        className={`max-w-[90%] rounded-xl p-2.5 text-xs flex flex-col gap-1 transition-all ${
                          msg.sender === 'user'
                            ? 'align-self-end ml-auto bg-[#1c1917] text-white rounded-br-none'
                            : msg.sender === 'partner' && activeFeedTab === 'dialogue'
                            ? 'align-self-start mr-auto bg-emerald-50 text-[#0f766e] border border-emerald-200 rounded-bl-none'
                            : 'align-self-start mr-auto bg-white text-stone-800 shadow-sm border border-stone-200 rounded-bl-none'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-extrabold text-[9px] tracking-wide text-stone-400 uppercase">
                            {msg.sender === 'user' 
                              ? "여행자 (나) ➔ 한국어" 
                              : activeFeedTab === 'dialogue' 
                              ? "현지인 (상대) ➔ 日本語" 
                              : "현지 직원 ➔ 日本語"}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handlePlayTTS(msg.translatedText, msg.lang === 'ko' ? 'ja' : 'ko')}
                            className="hover:scale-110 active:scale-90 transition-transform p-0.5"
                            title="소리 듣기"
                          >
                            <Volume2 className={`w-3 h-3 ${msg.sender === 'user' ? 'text-stone-300 hover:text-stone-100' : 'text-stone-500 hover:text-stone-800'}`} />
                          </button>
                        </div>
                        <p className="font-medium text-stone-800">{msg.text}</p>
                        <div className={`border-t pt-1 mt-1 font-extrabold ${
                          msg.sender === 'user' 
                            ? 'border-white/10 text-yellow-300 text-[13px]' 
                            : 'border-stone-100 text-[#dc2626] text-[13px]'
                        }`}>
                          {msg.translatedText}
                        </div>
                        {msg.pronunciation && (
                          <span className={`block italic text-[10px] ${msg.sender === 'user' ? 'text-stone-350' : 'text-stone-500'}`}>
                            [{msg.pronunciation}]
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 text-stone-400 text-[11px] bg-white rounded-lg border border-stone-150 border-dashed">
                      {activeFeedTab === 'translate' 
                        ? "최근에 녹음하거나 직접 번역한 내역이 비어 있습니다."
                        : "양방향 대화 모드에서 주고받은 피드가 아직 없습니다. 대화 탭에서 마이크를 눌러 시작해 보세요."}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 1.5: Bidirectional Live Dialogue Interpretative System */}
        {activeTab === 'dialogue' && (
          <div id="tab-dialogue-content" className="flex flex-col flex-1 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shadow-md min-h-[460px] animate-fadeIn">
            
            {/* Top Viewport Half (Japanese Segment) - Deep Teal Card */}
            <div 
              id="dialogue-partner-viewport"
              className={`flex-1 flex flex-col justify-between p-5 relative transition-all duration-500 bg-[#0d9488] text-white ${
                dialogueFlipped ? 'transform rotate-180 rounded-b-xl' : 'rounded-t-xl'
              }`}
            >
              {dialogueSpeechError?.lang === 'ja' && (
                <div className="absolute top-12 left-4 right-4 bg-red-900/90 text-white text-[11px] font-medium p-2.5 rounded-lg border border-red-800 flex items-center justify-between gap-2 animate-fadeIn z-20">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>{dialogueSpeechError.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDialogueSpeechError(null)}
                    className="text-white/60 hover:text-white text-xs px-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {dialogueIsListening === 'ja' && (
                <div className="absolute inset-0 bg-[#0d9488]/95 rounded-t-xl flex flex-col items-center justify-center gap-3 animate-fadeIn z-20">
                  <div className="flex items-center gap-1.5 justify-center h-12">
                    {isPreparingVoice ? (
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="w-1.5 h-8 bg-white rounded-full animate-soundwave1 origin-center"></span>
                        <span className="w-1.5 h-8 bg-white rounded-full animate-soundwave2 origin-center"></span>
                        <span className="w-1.5 h-8 bg-white rounded-full animate-soundwave3 origin-center"></span>
                        <span className="w-1.5 h-8 bg-white rounded-full animate-soundwave4 origin-center"></span>
                        <span className="w-1.5 h-8 bg-white rounded-full animate-soundwave5 origin-center"></span>
                      </>
                    )}
                  </div>
                  <p className="text-xs font-bold text-white animate-pulse flex items-center gap-1">
                    <Mic className={`w-3.5 h-3.5 ${isPreparingVoice ? 'opacity-50' : ''}`} />
                    <span>{isPreparingVoice ? "마이크 준비 중..." : "일본어 음성을 듣고 있습니다..."}</span>
                  </p>
                </div>
              )}
              {/* Top Controls / Action row */}
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
                  <span>日本語</span>
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping"></span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Flip direction toggle */}
                  <button
                    id="btn-dialogue-flip"
                    type="button"
                    onClick={() => setDialogueFlipped(!dialogueFlipped)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg transition-all flex items-center gap-1 text-[10px] font-semibold"
                    title={dialogueFlipped ? "원래 방향으로 뒤집기" : "상대방 방향으로 화면 뒤집기"}
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>뒤집기</span>
                  </button>

                  {dialogueJaText && (
                    <button
                      id="btn-dialogue-ja-clear"
                      type="button"
                      onClick={() => setDialogueJaText("")}
                      className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px]"
                    >
                      지우기
                    </button>
                  )}
                </div>
              </div>

              {/* Japanese dialogue text display */}
              <div className="my-auto text-center px-4 py-2 z-10 flex flex-col items-center justify-center">
                {dialogueJaText ? (
                  <div className="animate-scaleIn flex flex-col items-center gap-2">
                    <h3 className="text-2xl font-black tracking-wide leading-snug select-all">
                      {dialogueJaText}
                    </h3>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        id="btn-dialogue-ja-tts"
                        type="button"
                        onClick={() => handlePlayTTS(dialogueJaText, 'ja')}
                        className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full transition-all flex items-center gap-1 text-xs"
                        title="다시 듣기"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">발음 듣기</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/60 text-sm font-medium tracking-wide">
                    상대방이 마이크를 누르고 말하면 이곳에 보입니다.
                  </p>
                )}
              </div>

              {/* Top Microphone button positioned precisely */}
              <div className="flex justify-center items-center pb-2 z-30">
                <button
                  id="btn-dialogue-mic-ja"
                  type="button"
                  onClick={() => toggleDialogueListening('ja')}
                  className={`relative p-5 rounded-full transition-all duration-300 shadow-lg ${
                    dialogueIsListening === 'ja'
                      ? 'bg-red-500 scale-110 text-white animate-pulse'
                      : 'bg-white hover:bg-stone-50 text-[#0d9488] hover:scale-105 active:scale-95'
                  }`}
                  title={dialogueIsListening === 'ja' ? "듣는 중... 클릭 시 정지" : "일본어 음성 입력 시작"}
                >
                  {/* Subtle ripples */}
                  {dialogueIsListening === 'ja' && (
                    <div className="absolute inset-0 rounded-full bg-red-400 opacity-60 animate-ping -z-10"></div>
                  )}
                  {dialogueIsListening === 'ja' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Split demarcation bar with clean capsule state metadata */}
            <div className="h-0.5 bg-stone-300 relative z-30 flex items-center justify-center">
              <div className="absolute bg-[#1c1917] text-[#f5f5f4] text-[10px] font-bold px-3 py-1 rounded-full border border-stone-200 shadow-md flex items-center gap-1 uppercase select-none tracking-widest leading-none">
                <span>한 국 어</span>
                <span className="text-stone-400 font-extralight mx-0.5">|</span>
                <span>日 本 語</span>
              </div>
            </div>

            {/* Bottom Viewport Half (Korean Segment) - Elegant Neutral Card */}
            <div 
              id="dialogue-user-viewport"
              className="flex-1 flex flex-col justify-between p-5 relative bg-white rounded-b-xl"
            >
              {dialogueSpeechError?.lang === 'ko' && (
                <div className="absolute top-12 left-4 right-4 bg-red-50 text-red-750 text-[11px] font-medium p-2.5 rounded-lg border border-red-150 flex items-center justify-between gap-2 animate-fadeIn z-20">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-655 shrink-0" />
                    <span>{dialogueSpeechError.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDialogueSpeechError(null)}
                    className="text-stone-400 hover:text-stone-700 text-xs px-1 font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}

              {dialogueIsListening === 'ko' && (
                <div className="absolute inset-0 bg-white/95 rounded-b-xl flex flex-col items-center justify-center gap-3 animate-fadeIn z-20">
                  <div className="flex items-center gap-1.5 justify-center h-12">
                    {isPreparingVoice ? (
                      <div className="w-8 h-8 border-4 border-[#0d9488]/30 border-t-[#0d9488] rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span className="w-1.5 h-8 bg-[#0d9488] rounded-full animate-soundwave1 origin-center"></span>
                        <span className="w-1.5 h-8 bg-[#0d9488] rounded-full animate-soundwave2 origin-center"></span>
                        <span className="w-1.5 h-8 bg-[#0d9488] rounded-full animate-soundwave3 origin-center"></span>
                        <span className="w-1.5 h-8 bg-[#0d9488] rounded-full animate-soundwave4 origin-center"></span>
                        <span className="w-1.5 h-8 bg-[#0d9488] rounded-full animate-soundwave5 origin-center"></span>
                      </>
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#0d9488] animate-pulse flex items-center gap-1">
                    <Mic className={`w-3.5 h-3.5 ${isPreparingVoice ? 'opacity-50' : ''}`} />
                    <span>{isPreparingVoice ? "마이크 준비 중..." : "한국어 음성을 듣고 있습니다..."}</span>
                  </p>
                </div>
              )}
              {/* Bottom Controls / Action row */}
              <div className="flex justify-between items-center z-10 mt-2">
                <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1 rounded-full text-[10px] font-bold text-stone-700 tracking-wide">
                  <span>한국어</span>
                  <span className="w-1.5 h-1.5 bg-[#dc2626] rounded-full"></span>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                  <span>성별:</span>
                  <span className="text-stone-700 font-bold">
                    {voiceGender === 'female' ? "여성 목소리" : "남성 목소리"}
                  </span>
                </div>

                {dialogueKoText && (
                  <button
                    id="btn-dialogue-ko-clear"
                    type="button"
                    onClick={() => setDialogueKoText("")}
                    className="p-1.2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-[10px] px-2"
                  >
                    지우기
                  </button>
                )}
              </div>

              {/* Korean dialogue text display */}
              <div className="my-auto text-center px-4 py-2 z-10 flex flex-col items-center justify-center">
                {dialogueKoText ? (
                  <div className="animate-scaleIn flex flex-col items-center gap-2">
                    <h3 className="text-2xl font-black text-stone-900 tracking-wide leading-snug select-all">
                      {dialogueKoText}
                    </h3>
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        id="btn-dialogue-ko-tts"
                        type="button"
                        onClick={() => handlePlayTTS(dialogueKoText, 'ko')}
                        className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full transition-all flex items-center gap-1 text-xs"
                        title="다시 듣기"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">발음 듣기</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-400 text-sm font-medium tracking-wide">
                    아래 마이크를 누르고 말하면 번역할 한국어가 여기에 표시됩니다.
                  </p>
                )}
              </div>

              {/* Bottom Microphone button positioned precisely */}
              <div className="flex justify-center items-center pb-2 z-30">
                <button
                  id="btn-dialogue-mic-ko"
                  type="button"
                  onClick={() => toggleDialogueListening('ko')}
                  className={`relative p-5 rounded-full transition-all duration-300 shadow-lg ${
                    dialogueIsListening === 'ko'
                      ? 'bg-red-500 scale-110 text-white animate-pulse'
                      : 'bg-[#0d9488] hover:bg-[#0f766e] text-white hover:scale-105 active:scale-95'
                  }`}
                  title={dialogueIsListening === 'ko' ? "듣는 중... 클릭 시 정지" : "한국어 음성 입력 시작"}
                >
                  {/* Subtle ripples */}
                  {dialogueIsListening === 'ko' && (
                    <div className="absolute inset-0 rounded-full bg-red-400 opacity-60 animate-ping -z-10"></div>
                  )}
                  {dialogueIsListening === 'ko' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Intelligent Camera / Multi-mode Image OCR Helper */}
        {activeTab === 'camera' && (
          <div id="tab-camera-content" className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 items-stretch">
            {/* Left Column: One Photo Analysis */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center flex flex-col justify-between h-full min-h-[350px]">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="inline-block bg-[#dc2626] text-white text-[9px] tracking-widest font-black px-2 py-0.5 rounded-full">
                      GEMINI 3.5 MULTIMODAL
                    </span>
                    <span className="text-xs font-bold text-stone-550">정밀 분석</span>
                  </div>
                  <h2 className="text-base font-bold text-stone-850 flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-red-600" />
                    <span>사진 한 장으로 일본어 분석하기</span>
                  </h2>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1 leading-relaxed">
                    식당의 손글씨 메뉴판, 난해한 온천안내문, 거리 상점의 세일 표지판 등을 앨범에서 선택하거나 실시간 카메라로 촬영해 올려보세요.
                  </p>
                </div>

                {/* Photo Input handler */}
                {!imagePreview ? (
                  <div className="mt-4 border-2 border-dashed border-stone-300 rounded-xl py-8 px-4 flex flex-col items-center justify-center bg-stone-50 hover:bg-stone-100/50 transition-colors relative cursor-pointer flex-1 min-h-[190px]">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="input-camera-file"
                    />
                    <Upload className="w-10 h-10 text-stone-400 mb-2 stroke-1" />
                    <span className="text-xs font-bold text-stone-700">이곳을 클릭하여 사진 올리기</span>
                    <span className="text-[10px] text-stone-400 mt-1">카메라 촬영 혹은 이미지 파일 첨부</span>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 flex-1 justify-center">
                    <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 max-h-[195px] min-h-[190px] flex items-center justify-center">
                      <img 
                        src={imagePreview} 
                        alt="여행 분석용" 
                        className="max-h-[190px] object-contain"
                      />
                      <button
                        type="button"
                        id="btn-remove-photo"
                        onClick={resetImageWorkspace}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5 px-2.5 text-xs transition-colors"
                      >
                        사진 변경
                      </button>
                    </div>

                    {imageError && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100">{imageError}</p>
                    )}

                    {!imageResult && (
                      <button
                        type="button"
                        id="btn-execute-ocr"
                        onClick={handleAnalyzeImage}
                        disabled={isAnalyzingImage}
                        className="w-full bg-[#1c1917] hover:bg-stone-800 disabled:bg-stone-200 text-[#f5f5f4] disabled:text-stone-400 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        {isAnalyzingImage ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-stone-400 border-t-white rounded-full animate-spin"></div>
                            <span>사진 문자 분석 & 번역하는 중...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-stone-300" />
                            <span>AI 메뉴판/표지판 번역 실행</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* OCR Translation Result Panel */}
              {imageResult && (
                <div id="ocr-results" className="bg-white rounded-xl border border-stone-200 shadow-md p-4 flex flex-col gap-4 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-black block">
                      인증된 시각 분석 결과
                    </span>
                    <button
                      type="button"
                      onClick={resetImageWorkspace}
                      className="text-stone-400 hover:text-stone-600 text-[10px] font-bold"
                    >
                      새 분석하기
                    </button>
                  </div>

                  {/* Summarized Overall translated text */}
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-150">
                    <span className="text-[9px] text-[#dc2626] font-bold tracking-wider uppercase block mb-1">인식된 원문 요약</span>
                    <p className="text-xs text-stone-500 mb-2 font-mono">{imageResult.detectedText}</p>
                    
                    <span className="text-[9px] text-[#dc2626] font-bold tracking-wider uppercase block mb-0.5">통합 번역 해석</span>
                    <p className="text-sm font-bold text-stone-800 leading-normal">{imageResult.translatedText}</p>
                  </div>

                  {/* Structured detailed list (menu prices, directions, items) */}
                  {imageResult.items && imageResult.items.length > 0 && (
                    <div>
                      <span className="text-[10px] text-stone-400 tracking-wider font-extrabold uppercase block mb-2">세부 항목 가이드 ({imageResult.items.length}개 발견)</span>
                      <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                        {imageResult.items.map((item, idx) => (
                          <div 
                            key={idx} 
                            className="p-2.5 rounded-lg border border-stone-100 hover:border-stone-200 bg-white transition-all flex flex-col gap-1 text-xs"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-semibold text-stone-900 font-mono text-xs">{item.original}</span>
                              {item.price && (
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-bold text-[10px]">
                                  {item.price}
                                </span>
                              )}
                            </div>
                            
                            {item.pronunciation && (
                              <span className="text-[10px] text-stone-500 italic block">
                                독음: {item.pronunciation}
                              </span>
                            )}

                            <div className="font-bold text-stone-800 flex items-center gap-1 mt-0.5">
                              <span className="text-[#dc2626] text-[10px]">뜻:</span>
                              <span>{item.translated}</span>
                            </div>

                            <div className="flex justify-end mt-1 gap-1">
                              <button
                                type="button"
                                onClick={() => handlePlayTTS(item.translated, 'ko')}
                                className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-600"
                                title="한국어 발음 듣기"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => loadPresetTranslation(item.original, item.translated, item.pronunciation)}
                                className="text-[9px] text-stone-400 hover:text-[#dc2626] font-semibold border border-transparent hover:border-stone-150 p-0.5 px-1.5 rounded transition-colors"
                                title="본문 번역 탭으로 보내기"
                              >
                                대화하기로 전달
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual traveler guidance block */}
                  {imageResult.guideTip && (
                    <div className="bg-amber-50 rounded-lg p-3 text-xs text-stone-700 leading-relaxed border border-amber-100 flex gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-stone-800 block mb-0.5">현지 여행 꿀팁 (Guide Tip)</span>
                        <p>{imageResult.guideTip}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Real-time Video Camera Translation */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center flex flex-col justify-between h-full min-h-[350px] animate-fadeIn">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="inline-block bg-emerald-600 text-white text-[9px] tracking-widest font-black px-2 py-0.5 rounded-full">
                      LIVE AR LENS
                    </span>
                    <span className="text-xs font-bold text-stone-500">실시간 연동</span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-800 flex items-center justify-center gap-1.5">
                    <Video className="w-4 h-4 text-emerald-600" />
                    <span>실시간 비디오 카메라 번역기</span>
                  </h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1 leading-relaxed">
                    카메라 화면을 실시간으로 켜고 고정하면 일본어 글자를 촬영하여 자동으로 바로 한국어로 번역 분석해줍니다.
                  </p>
                </div>

                {/* Error logs inside camera */}
                {liveCameraError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 text-left mt-2">
                    {liveCameraError}
                  </p>
                )}

                {/* Main Camera Video Stage or Activation Button */}
                {isLiveCameraActive ? (
                  <div className="flex flex-col gap-3 mt-4 flex-1 justify-center">
                    <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black aspect-video flex items-center justify-center shadow-inner max-h-[195px] min-h-[190px]">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {isAnalyzingLiveFrame && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 text-white">
                          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                          <span className="text-xs font-bold tracking-wide">실시간 렌즈 분석 중...</span>
                        </div>
                      )}
                      
                      {/* Floating HUD status indicator */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md flex items-center gap-1 text-[10px] text-white font-mono">
                        <span className={`w-1.5 h-1.5 rounded-full ${isAutoScanActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                        <span>{isAutoScanActive ? 'AUTO SCANNING' : 'STANDBY'}</span>
                      </div>
                    </div>

                    {/* Hidden canvas utility for capturing pixels */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Operational Controls */}
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="btn-live-capture-now"
                          onClick={captureAndAnalyzeLiveFrame}
                          disabled={isAnalyzingLiveFrame}
                          className="bg-[#1c1917] hover:bg-stone-800 text-white font-bold text-[11px] py-2 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5 text-stone-300" />
                          <span>즉시 화면 번역</span>
                        </button>

                        <button
                          type="button"
                          id="btn-toggle-auto-scan"
                          onClick={() => setIsAutoScanActive(!isAutoScanActive)}
                          className={`font-bold text-[11px] py-2 rounded-lg transition-all flex items-center justify-center gap-1 border ${
                            isAutoScanActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                          }`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isAutoScanActive ? 'animate-spin text-emerald-600' : 'text-stone-400'}`} />
                          <span>{isAutoScanActive ? '자동 스캔 중 (5초)' : '자동 번역 켜기'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        id="btn-stop-live-camera"
                        onClick={stopLiveCamera}
                        className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1"
                      >
                        <VideoOff className="w-4 h-4" />
                        <span>카메라 끄기</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col flex-1 justify-center min-h-[190px]">
                    <button
                      type="button"
                      id="btn-start-live-camera"
                      onClick={startLiveCamera}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
                    >
                      <Video className="w-4 h-4 text-emerald-100" />
                      <span>실시간 비디오 카메라 열기</span>
                    </button>
                    <p className="text-[10px] text-stone-400 mt-2">안내판이나 상점 한자/가나 글씨를 렌즈 중앙에 비춰보세요</p>
                  </div>
                )}
              </div>

              {/* Render Live camera analysis results below locally */}
              {liveImageResult && (
                <div className="bg-white border border-stone-200 rounded-xl p-4 text-left shadow-md flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-stone-150 pb-1.5">
                    <span className="text-[9px] text-emerald-700 font-black tracking-wider uppercase">
                      실시간 렌즈 번역 결과
                    </span>
                    <button
                      type="button"
                      onClick={() => setLiveImageResult(null)}
                      className="text-stone-400 hover:text-stone-600 text-[10px]"
                    >
                      결과 지우기
                    </button>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#dc2626] font-extrabold block">인식된 원본 텍스트:</span>
                    <p className="text-stone-600 font-mono text-[11px] font-semibold mt-0.5">{liveImageResult.detectedText}</p>
                  </div>

                  <div>
                    <span className="text-[9px] text-[#dc2626] font-extrabold block">실시간 한글 번역:</span>
                    <p className="font-bold text-stone-800 text-[12px] leading-relaxed mt-0.5">{liveImageResult.translatedText}</p>
                  </div>

                  {liveImageResult.items && liveImageResult.items.length > 0 && (
                    <div className="border-t border-stone-150 pt-2 flex flex-col gap-1.5">
                      <span className="text-[9px] text-stone-400 font-extrabold">감지된 세부 메뉴/글자 항목:</span>
                      <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                        {liveImageResult.items.map((item: any, i: number) => (
                          <div key={i} className="bg-white p-2 rounded border border-stone-100 flex flex-col gap-0.5">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-stone-950 text-[11px] font-mono">{item.original}</span>
                              {item.price && (
                                <span className="bg-amber-50 text-amber-800 px-1 text-[9px] font-bold rounded">
                                  {item.price}
                                </span>
                              )}
                            </div>
                            {item.pronunciation && (
                              <span className="text-[10px] text-stone-500 italic">
                                발음: {item.pronunciation}
                              </span>
                            )}
                            <div className="text-[11px] font-bold text-stone-800 mt-0.5">
                              <span className="text-[#dc2626] text-[9.5px] mr-1">뜻:</span>
                              {item.translated}
                            </div>
                            <div className="flex justify-end gap-1.5 mt-1 border-t border-stone-100/40 pt-1">
                              <button
                                type="button"
                                onClick={() => handlePlayTTS(item.translated, 'ko')}
                                className="p-0.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-600"
                                title="한국어 발음 듣기"
                              >
                                <Volume2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => loadPresetTranslation(item.original, item.translated, item.pronunciation)}
                                className="text-[9px] text-stone-450 hover:text-[#dc2626] font-bold"
                              >
                                대화하기로 전송
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {liveImageResult.guideTip && (
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded text-[11px] text-stone-700 leading-relaxed mt-1 font-semibold">
                      <p className="font-extrabold text-[#92400e]">💡 실시간 여행 팁</p>
                      <p className="mt-0.5 font-medium">{liveImageResult.guideTip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Japanese Survival Phrasebook with search and interactive audio playbacks */}
        {activeTab === 'phrasebook' && (
          <div id="tab-phrasebook-content" className="flex flex-col gap-3 flex-1">
            
            {/* Horizontal Pill category switcher */}
            <div className="flex gap-1 overflow-x-auto pb-1.5 max-w-full select-none justify-start">
              {TRAVEL_PHRASE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setPhraseSearch(""); }}
                  className={`px-3 py-2 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-[#1c1917] text-[#f5f5f4]'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            {/* Quick search filter in phrasebook */}
            <div className="bg-white p-2 rounded-xl border border-stone-200 shadow-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-stone-400 shrink-0 ml-1.5" />
              <input
                type="text"
                value={phraseSearch}
                onChange={(e) => setPhraseSearch(e.target.value)}
                placeholder="전체 상황 회화 단어/문장 빠른 필터..."
                className="w-full bg-transparent border-none text-xs text-stone-800 focus:outline-none py-1 placeholder-stone-400"
              />
              {phraseSearch && (
                <button 
                  onClick={() => setPhraseSearch("")} 
                  className="text-stone-400 hover:text-stone-600 text-xs px-2"
                >
                  지우기
                </button>
              )}
            </div>

            {/* Structured filtered survival phrases card stack */}
            <div className="flex flex-col gap-2.5 max-h-[430px] overflow-y-auto">
              {filteredPhrases.length > 0 ? (
                filteredPhrases.map((phrase) => (
                  <div
                    key={phrase.id}
                    className="bg-white rounded-xl border border-stone-200 hover:border-stone-300 shadow-sm p-3.5 flex flex-col gap-2 transition-all relative group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-[10px] text-stone-400 font-bold tracking-wider">{activePhraseCategory?.name}</span>
                        <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handlePlayTTS(phrase.japanese, 'ja')}
                            className="p-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800"
                            title="일본어 발음 듣기"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => loadPresetTranslation(phrase.japanese, phrase.korean, phrase.pronunciation)}
                            className="text-[10px] text-stone-500 hover:text-[#dc2626] font-bold border border-stone-100 hover:border-stone-200 px-2 py-0.5 rounded transition-colors"
                          >
                            통역관에 입력
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-stone-900 mt-1">
                        {phrase.korean}
                      </h4>
                      
                      <div className="text-base font-extrabold text-[#dc2626] mt-0.5 select-all">
                        {phrase.japanese}
                      </div>

                      <div className="text-xs font-semibold text-stone-600 tracking-wide mt-0.5 italic">
                        [발음] {phrase.pronunciation}
                      </div>
                    </div>

                    {phrase.explanation && (
                      <p className="text-[11px] text-stone-500 border-t border-stone-100 pt-1.5 leading-relaxed mt-1">
                        💡 {phrase.explanation}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center p-8 text-stone-400 text-xs bg-white rounded-xl border border-stone-150">
                  일치하는 단어나 필수 회화문이 없습니다. 검색어를 바꿔 보세요.
                </div>
              )}
            </div>

            {/* Travel instruction footer notice */}
            <div className="bg-stone-100/60 rounded-xl p-3 text-[11px] text-stone-600 leading-relaxed border border-stone-200 flex gap-1.5 items-start mt-1">
              <span className="text-amber-600">💡</span>
              <p>
                인터넷이나 데이터 통신 불안정 상태에 접어들어도 이 서바이벌 회화집은 즉시 오프라인 로컬 데이터로 재생 가능합니다. 일본 상인의 질문에 침착하게 발음 부문이나 일본어를 점원에게 직접 보여주며 소통하세요.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: Persistent Translation History Box with favorite filter */}
        {activeTab === 'history' && (
          <div id="tab-history-content" className="flex flex-col gap-3 flex-1">
            
            {/* Filter buttons header (Show all vs bookmarked) */}
            <div className="flex items-center justify-between select-none">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setFavoritesOnly(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    !favoritesOnly 
                      ? 'bg-stone-800 text-white shadow-sm' 
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  모든 저장내역 ({historyItems.length})
                </button>
                <button
                  onClick={() => setFavoritesOnly(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    favoritesOnly 
                      ? 'bg-stone-800 text-white shadow-sm' 
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span>중요 보관함 ({historyItems.filter(i => i.isFavorite).length})</span>
                </button>
              </div>

              {historyItems.length > 0 && (
                <button
                  id="btn-delete-all-history"
                  onClick={clearAllHistory}
                  className="text-stone-400 hover:text-red-600 text-[11px] font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>전체 삭제</span>
                </button>
              )}
            </div>

            {/* History stack container */}
            <div className="flex flex-col gap-2.5 max-h-[440px] overflow-y-auto">
              {historyItems.length > 0 ? (
                (() => {
                  const itemsToShow = favoritesOnly 
                    ? historyItems.filter(i => i.isFavorite) 
                    : historyItems;

                  if (itemsToShow.length === 0) {
                    return (
                      <div className="text-center p-8 text-stone-400 text-xs bg-white rounded-xl border border-stone-200">
                        중요 보관 항목으로 지정된 보관 기록이 없습니다. 별표 아이콘을 눌러 저장해 보세요!
                      </div>
                    );
                  }

                  return itemsToShow.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => loadPresetTranslation(item.sourceText, item.translatedText, item.pronunciation || "")}
                      className="bg-white rounded-xl border border-stone-200 hover:border-stone-300 p-3.5 flex flex-col gap-2 transition-all cursor-pointer relative group"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[10px] bg-stone-100 text-stone-600 font-extrabold px-1.5 py-0.5 rounded">
                          {item.sourceLang === 'ko' ? "한국어 ➔ 일본어" : "일본어 ➔ 한국어"}
                        </span>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => toggleFavorite(item.id, e)}
                            className="p-1 hover:bg-stone-100 rounded transition-colors"
                            title="중요 표현 저장"
                          >
                            <Star className={`w-4 h-4 ${
                              item.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-stone-300 hover:text-amber-400'
                            }`} />
                          </button>
                          <button
                            onClick={(e) => deleteHistoryRow(item.id, e)}
                            className="p-1 hover:bg-red-50 text-stone-300 hover:text-red-600 rounded transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-stone-500 leading-snug font-mono whitespace-pre-wrap">
                          {item.sourceText}
                        </p>
                        <p className="text-sm font-bold text-stone-800 leading-snug mt-1 text-[#dc2626]">
                          {item.translatedText}
                        </p>
                        {item.pronunciation && (
                          <span className="block text-[11px] text-stone-500 italic mt-0.5">
                            발음: [ {item.pronunciation} ]
                          </span>
                        )}
                        {item.explanation && (
                          <div className="mt-1.5 text-[10px] text-stone-400 leading-relaxed border-t border-stone-100 pt-1">
                            💡 {item.explanation.slice(0, 100)}...
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-1 text-[9px] text-stone-400">
                        <span>{new Date(item.timestamp).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-stone-300 font-extrabold group-hover:text-stone-500 transition-colors">클릭하여 통역관으로 로드 ➔</span>
                      </div>
                    </div>
                  ));
                })()
              ) : (
                <div className="border border-dashed border-stone-300 rounded-xl p-12 text-center text-stone-400 text-xs flex flex-col items-center gap-1 select-none">
                  <Star className="w-8 h-8 text-stone-300 mb-1" />
                  <p className="font-semibold">번역 저장 기록이 비어 있습니다.</p>
                  <p className="text-[10px] text-stone-400 max-w-sm mt-0.5">실시간 대화 통역이나 단어 번역 결과문들이 여기에 자동으로 영구 수집됩니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* 🇯🇵 Core Trip Helpful Phrase Slider Banner */}
      <footer id="app-footer" className="bg-[#1c1917] hover:bg-stone-900 border-t border-stone-800 text-[#f5f5f4] p-3 text-center transition-colors">
        <div className="flex items-center justify-center gap-1.5 select-none cursor-pointer" onClick={() => setActiveTab('phrasebook')}>
          <BookMarked className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span className="text-[11px] font-bold text-stone-200">
            일본 현지 식당 면세, 와이파이, 교통 필수 가이드 수록 ➔
          </span>
        </div>
      </footer>
    </div>
  );
}

