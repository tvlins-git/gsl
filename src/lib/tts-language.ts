import type { LearningLanguage } from "../games/types";

const DEFAULT_VOICE_ID = "ara";
const PREFERRED_VOICE_IDS = ["eve", "ara", "luna", "sal"];

export type ListedVoice = {
  voice_id?: string;
  name?: string;
  language?: string | null;
  languages?: unknown;
  description?: string;
  accent?: string;
};

export type TtsBody = {
  text: string;
  voice_id: string;
  language: string;
};

export function ttsLanguageCodes(language: LearningLanguage): {
  primary: string;
  fallback: string;
} {
  if (language === "da") return { primary: "da-DK", fallback: "da" };
  if (language === "sv") return { primary: "sv-SE", fallback: "sv" };
  return { primary: "en", fallback: "auto" };
}

export function ttsRequestBody(
  text: string,
  voiceId: string,
  languageCode: string,
): TtsBody {
  return {
    text,
    voice_id: voiceId,
    language: languageCode,
  };
}

export function letterSpeechAttempts(
  text: string,
  language: LearningLanguage,
  voiceId: string,
): [TtsBody, TtsBody] {
  const codes = ttsLanguageCodes(language);
  return [
    ttsRequestBody(text, voiceId, codes.primary),
    ttsRequestBody(text, voiceId, codes.fallback),
  ];
}

function voiceBlob(voice: ListedVoice): string {
  const languages = Array.isArray(voice.languages)
    ? voice.languages.filter((item): item is string => typeof item === "string")
    : [];
  return [voice.language, voice.name, voice.description, voice.accent, ...languages]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
}

function voiceFits(voice: ListedVoice, language: LearningLanguage): boolean {
  const blob = voiceBlob(voice);
  if (language === "da") return /\bda\b|da-dk|danish|dansk/.test(blob);
  if (language === "sv") return /\bsv\b|sv-se|swedish|svensk/.test(blob);
  return /\ben\b|en-us|en-gb|english/.test(blob);
}

export function pickVoiceId(
  voices: readonly ListedVoice[],
  language: LearningLanguage,
): string {
  const usable = voices.filter(
    (voice) => typeof voice.voice_id === "string" && voice.voice_id.trim() !== "",
  );
  const fitting = usable.filter((voice) => voiceFits(voice, language));
  const pool = fitting.length > 0 ? fitting : usable;
  for (const id of PREFERRED_VOICE_IDS) {
    if (pool.some((voice) => voice.voice_id === id)) return id;
  }
  return pool[0]?.voice_id ?? DEFAULT_VOICE_ID;
}
