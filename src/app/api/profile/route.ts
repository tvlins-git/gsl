import { isLearningLanguage } from "@/lib/i18n";
import {
  PREVIEW_COOKIE,
  previewCookieOptions,
  readPreview,
} from "@/lib/preview";
import { validateName } from "@/lib/family-code";
import { hasGate } from "@/lib/require-gate";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!(await hasGate())) {
    return NextResponse.json(
      { error: "signed_out", message: "Enter the code first." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    language?: string;
    displayName?: string;
  } | null;

  const language = body?.language;
  const displayName = body?.displayName?.trim();

  if (language && !isLearningLanguage(language)) {
    return NextResponse.json(
      { error: "language", message: "Choose Danish, Swedish, or English." },
      { status: 400 },
    );
  }
  if (displayName !== undefined && !validateName(displayName)) {
    return NextResponse.json(
      { error: "name", message: "Write her name." },
      { status: 400 },
    );
  }

  if (!supabaseConfigured()) {
    const preview = await readPreview();
    if (!preview) {
      return NextResponse.json(
        { error: "signed_out", message: "Sign in with the family code first." },
        { status: 401 },
      );
    }
    const next = {
      ...preview,
      language: language ?? preview.language,
      displayName: displayName || preview.displayName,
    };
    const response = NextResponse.json({ ok: true, language: next.language });
    response.cookies.set(PREVIEW_COOKIE, JSON.stringify(next), previewCookieOptions());
    return response;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "signed_out", message: "Sign in with the family code first." },
      { status: 401 },
    );
  }

  const patch: { language?: string; display_name?: string } = {};
  if (language) patch.language = language;
  if (displayName) patch.display_name = displayName;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    return NextResponse.json(
      { error: "save_failed", message: "Pip could not save that." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, language: language ?? null });
}
