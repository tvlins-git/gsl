import type { LearningLanguage } from "@/games/types";
import { speechMatches } from "@/lib/speech-match";

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

function apiKey() {
  const key = process.env.GROK_API_KEY?.trim();
  if (!key) {
    throw new SpeechError(
      503,
      "speech_unavailable",
      "GROK_API_KEY is not set. A grown-up needs to add it before Pip can listen or speak.",
    );
  }
  return key;
}

export async function speak(text: string, language: LearningLanguage) {
  const key = apiKey();
  const spoken = text.trim();
  if (!spoken || spoken.length > 400) {
    throw new SpeechError(400, "bad_text", "Pip can only say a short line.");
  }

  const audio = await requestSpeech(key, spoken, language);
  return audio;
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
