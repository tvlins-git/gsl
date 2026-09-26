import { isLearningLanguage } from "@/lib/i18n";
import {
  PREVIEW_COOKIE,
  previewCookieOptions,
  readPreview,
  type PreviewProfile,
} from "@/lib/preview";
import { hasGate } from "@/lib/require-gate";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ACTIVITIES = new Set(["math", "alphabet", "word", "story"]);

type ProgressBody = {
  activity?: string;
  promptId?: string;
  language?: string;
  correct?: boolean;
};

export async function POST(request: Request) {
  if (!(await hasGate())) {
    return NextResponse.json(
      { error: "signed_out", message: "Enter the code first." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as ProgressBody | null;
  const activity = body?.activity ?? "";
  const promptId = (body?.promptId ?? "").trim();
  const language = body?.language ?? "";
  const correct = body?.correct === true;

  if (
    !ACTIVITIES.has(activity) ||
    !isLearningLanguage(language) ||
    promptId.length < 1 ||
    promptId.length > 80
  ) {
    return NextResponse.json(
      { error: "bad_result", message: "Pip could not save that answer." },
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
    const next = applyPreview(preview, activity, correct);
    const response = NextResponse.json(toPayload(next));
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

  const { data, error } = await supabase.rpc("record_answer", {
    p_activity: activity,
    p_item_key: promptId,
    p_language: language,
    p_correct: correct,
  });

  if (error || !data) {
    return NextResponse.json(
      { error: "save_failed", message: "Pip could not save that answer." },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}

function applyPreview(
  profile: PreviewProfile,
  activity: string,
  correct: boolean,
): PreviewProfile {
  const next = { ...profile };
  if (correct) {
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
    if (next.currentStreak % 5 === 0) next.stars += 1;
    if (activity === "math") {
      next.mathCorrect += 1;
      if (next.mathLevel === 1 && next.mathCorrect >= 15) next.mathLevel = 2;
    }
  } else {
    next.currentStreak = 0;
  }
  return next;
}

function toPayload(profile: PreviewProfile) {
  const milestone =
    profile.currentStreak > 0 && profile.currentStreak % 5 === 0
      ? profile.currentStreak
      : null;
  return {
    stars: profile.stars,
    currentStreak: profile.currentStreak,
    bestStreak: profile.bestStreak,
    mathLevel: profile.mathLevel,
    mathCorrect: profile.mathCorrect,
    milestone,
  };
}
