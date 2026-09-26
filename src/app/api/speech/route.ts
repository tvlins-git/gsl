import { isLearningLanguage } from "@/lib/i18n";
import { checkSpeech, speak, SpeechError } from "@/lib/grok";
import { readPreview } from "@/lib/preview";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function hasSession() {
  if (!supabaseConfigured()) {
    return Boolean(await readPreview());
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

export async function POST(request: Request) {
  if (!(await hasSession())) {
    return NextResponse.json(
      { error: "signed_out", message: "Sign in with the family code first." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    text?: string;
    audioBase64?: string;
    expected?: string;
    language?: string;
    letter?: boolean;
  } | null;

  const language = body?.language ?? "";
  if (!isLearningLanguage(language)) {
    return NextResponse.json(
      { error: "language", message: "Choose Danish, Swedish, or English." },
      { status: 400 },
    );
  }

  try {
    if (body?.action === "speak") {
      const audio = await speak(body.text ?? "", language, {
        letter: body.letter === true,
      });
      return new NextResponse(new Uint8Array(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "private, max-age=86400",
        },
      });
    }

    if (body?.action === "check") {
      const result = await checkSpeech(
        body.audioBase64 ?? "",
        body.expected ?? "",
        language,
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "bad_action", message: "Say whether to speak or to check." },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof SpeechError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "speech_failed", message: "Pip could not use sound just now." },
      { status: 502 },
    );
  }
}
