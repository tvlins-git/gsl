import type { LearningLanguage } from '../types';

const SPEECH_LOCALE: Record<LearningLanguage, string> = {
  da: 'da-DK',
  sv: 'sv-SE',
  en: 'en-US',
};

let currentAudio: HTMLAudioElement | null = null;
let playToken = 0;

function stopPlayback(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function hasSpeechSynthesis(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.speechSynthesis.speak === 'function'
  );
}

function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      action();
    };
    const timer = setTimeout(() => {
      audio.pause();
      finish(() => reject(new Error('audio playback failed')));
    }, 15000);
    audio.onended = () => finish(() => resolve());
    audio.onerror = () => finish(() => reject(new Error('audio playback failed')));
    void audio.play().catch((error: unknown) => {
      finish(() => reject(error instanceof Error ? error : new Error('audio playback failed')));
    });
  });
}

function speakWithSynthesis(text: string, language: LearningLanguage): Promise<void> {
  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LOCALE[language];
    utterance.rate = 0.9;
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      action();
    };
    const timer = setTimeout(() => finish(() => resolve()), 8000);
    utterance.onend = () => finish(() => resolve());
    utterance.onerror = () => finish(() => reject(new Error('speechSynthesis failed')));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export async function playSpeech(text: string, language: LearningLanguage): Promise<void> {
  const token = ++playToken;
  stopPlayback();

  try {
    const response = await fetch('/api/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'speak',
        text,
        language,
      }),
    });
    if (token !== playToken) return;
    if (!response.ok) {
      throw new Error('speech request failed');
    }
    const audio = await response.blob();
    if (token !== playToken) return;
    if (audio.size === 0) {
      throw new Error('speech request failed');
    }
    await playAudioBlob(audio);
  } catch (error) {
    if (token !== playToken) return;
    if (hasSpeechSynthesis()) {
      try {
        await speakWithSynthesis(text, language);
        return;
      } catch {
        // The browser voice could not speak either.
      }
    }
    throw error instanceof Error ? error : new Error('speech unavailable');
  }
}

export async function checkSpokenWord(
  audio: Blob,
  expected: string,
  language: LearningLanguage,
): Promise<boolean> {
  let response: Response;
  try {
    const audioBase64 = await blobToBase64(audio);
    response = await fetch('/api/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check',
        audioBase64,
        expected,
        language,
      }),
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error('speech check failed');
  }

  if (!response.ok) {
    throw new Error('speech check failed');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('speech check failed');
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('correct' in payload) ||
    typeof payload.correct !== 'boolean'
  ) {
    throw new Error('speech check failed');
  }

  return payload.correct;
}

export function recordUtterance(maxMs: number): Promise<Blob> {
  if (typeof navigator === 'undefined' || navigator.mediaDevices?.getUserMedia == null) {
    return Promise.reject(new Error('microphone unavailable'));
  }

  return navigator.mediaDevices.getUserMedia({ audio: true }).then(
    (stream) =>
      new Promise<Blob>((resolve, reject) => {
        const stopTracks = () => {
          stream.getTracks().forEach((track) => track.stop());
        };

        if (typeof MediaRecorder === 'undefined') {
          stopTracks();
          reject(new Error('microphone unavailable'));
          return;
        }

        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream);
        } catch (error) {
          stopTracks();
          reject(error instanceof Error ? error : new Error('microphone unavailable'));
          return;
        }

        const chunks: Blob[] = [];
        let settled = false;
        const finish = (action: () => void) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          stopTracks();
          action();
        };
        const timer = setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, maxMs);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => {
          finish(() => reject(new Error('microphone unavailable')));
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size === 0) {
            finish(() => reject(new Error('microphone unavailable')));
            return;
          }
          finish(() => resolve(blob));
        };

        try {
          recorder.start();
        } catch (error) {
          finish(() => reject(error instanceof Error ? error : new Error('microphone unavailable')));
        }
      }),
    () => Promise.reject(new Error('microphone unavailable')),
  );
}
