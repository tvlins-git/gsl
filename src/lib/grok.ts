import type { LearningLanguage } from "@/games/types";
import { speechMatches } from "@/lib/speech-match";
import {
  letterSpeechAttempts,
  pickVoiceId,
  type ListedVoice,
  type TtsBody,
} from "@/lib/tts-language";

const VOICE_ID = "ara";

export class SpeechError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function missingSpeechKey() {
  return new SpeechError(
    503,
    "speech_unavailable",
    "GROK_API_KEY is not set. A grown-up needs to add it before Pip can listen or speak.",
  );
}

function apiKey() {
  const key = process.env.GROK_API_KEY?.trim();
  if (!key) throw missingSpeechKey();
  return key;
}

export async function speak(
  text: string,
  language: LearningLanguage,
  options?: { letter?: boolean },
) {
  if (options?.letter) {
    const spoken = text.trim();
    if (!spoken || spoken.length > 400) {
      throw new SpeechError(400, "bad_text", "Pip can only say a short line.");
    }
    return speakLetter(spoken, language);
  }

  const key = apiKey();
  const spoken = text.trim();
  if (!spoken || spoken.length > 400) {
    throw new SpeechError(400, "bad_text", "Pip can only say a short line.");
  }

  const audio = await requestSpeech(key, spoken, language);
  return audio;
}

let cachedVoices: Promise<ListedVoice[]> | null = null;

async function listVoices(key: string): Promise<ListedVoice[]> {
  try {
    const response = await fetch("https://api.x.ai/v1/tts/voices", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { voices?: ListedVoice[] };
    return Array.isArray(payload.voices) ? payload.voices : [];
  } catch {
    return [];
  }
}

async function chooseVoice(key: string, language: LearningLanguage): Promise<string> {
  if (!cachedVoices) cachedVoices = listVoices(key);
  const voices = await cachedVoices;
  return pickVoiceId(voices, language);
}

async function postTts(
  key: string,
  body: TtsBody,
): Promise<{ ok: true; audio: Buffer } | { ok: false; status: number }> {
  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, audio: Buffer.from(await response.arrayBuffer()) };
}

function languageRejected(status: number): boolean {
  return status === 400 || status === 422;
}

async function speakLetter(text: string, language: LearningLanguage) {
  const key = process.env.GROK_API_KEY?.trim() ?? "";
  const voiceId = key ? await chooseVoice(key, language) : pickVoiceId([], language);
  const [primary, fallback] = letterSpeechAttempts(text, language, voiceId);
  const first = await postTts(key, primary).catch((error: unknown) => {
    if (!key) throw missingSpeechKey();
    throw error;
  });
  if (!key) throw missingSpeechKey();
  if (first.ok) return first.audio;
  if (!languageRejected(first.status)) {
    throw new SpeechError(502, "speech_failed", "Pip could not speak just now.");
  }

  const second = await postTts(key, fallback);
  if (!second.ok) {
    throw new SpeechError(502, "speech_failed", "Pip could not speak just now.");
  }
  return second.audio;
}

async function requestSpeech(
  key: string,
  text: string,
  language: LearningLanguage | "auto",
) {
  const response = await fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: VOICE_ID,
      language,
    }),
  });

  if (!response.ok && language !== "auto") {
    return requestSpeech(key, text, "auto");
  }

  if (!response.ok) {
    throw new SpeechError(
      502,
      "speech_failed",
      "Pip could not speak just now.",
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function checkSpeech(
  audioBase64: string,
  expected: string,
  language: LearningLanguage,
) {
  const key = apiKey();
  const target = expected.trim();
  if (!target || target.length > 400) {
    throw new SpeechError(400, "bad_text", "There is nothing to check.");
  }

  const base64 = audioBase64.replace(/^data:.*?;base64,/, "").trim();
  if (!base64 || base64.length > 2_000_000) {
    throw new SpeechError(400, "bad_audio", "The recording was empty.");
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch {
    throw new SpeechError(400, "bad_audio", "The recording could not be read.");
  }

  if (bytes.length < 16) {
    throw new SpeechError(400, "bad_audio", "The recording was empty.");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "audio/webm" }),
    "speech.webm",
  );
  form.append("language", language);

  const response = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!response.ok) {
    throw new SpeechError(
      502,
      "speech_failed",
      "Pip could not hear that just now.",
    );
  }

  const payload = (await response.json()) as { text?: string };
  return { correct: speechMatches(payload.text ?? "", target, language) };
}
