import {
  friendUnlockedAt,
  mergeUnlockedFriends,
  type FriendId,
} from "@/lib/friends";
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
    const { profile: next, unlockedFriend } = applyPreview(
      preview,
      activity,
      correct,
    );
    const response = NextResponse.json(toPayload(next, unlockedFriend));
    response.cookies.set(
      PREVIEW_COOKIE,
      JSON.stringify(next),
      previewCookieOptions(),
    );
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

  const stars = Number(data.stars ?? 0);
  const unlockedFriend =
    correct && data.milestone ? friendUnlockedAt(stars)?.id ?? null : null;

  return NextResponse.json({
    ...data,
    unlockedFriends: mergeUnlockedFriends(undefined, stars),
    unlockedFriend,
  });
}

function applyPreview(
  profile: PreviewProfile,
  activity: string,
  correct: boolean,
): { profile: PreviewProfile; unlockedFriend: FriendId | null } {
  const next = { ...profile };
  let unlockedFriend: FriendId | null = null;
  if (correct) {
    next.currentStreak += 1;
    next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
    if (next.currentStreak % 5 === 0) {
      next.stars += 1;
      const friend = friendUnlockedAt(next.stars);
      if (friend && !next.unlockedFriends.includes(friend.id)) {
        next.unlockedFriends = [...next.unlockedFriends, friend.id];
        unlockedFriend = friend.id;
      } else if (friend) {
        unlockedFriend = friend.id;
      }
    }
    if (activity === "math") {
      next.mathCorrect += 1;
      if (next.mathLevel === 1 && next.mathCorrect >= 15) next.mathLevel = 2;
    }
  } else {
    next.currentStreak = 0;
  }
  next.unlockedFriends = mergeUnlockedFriends(
    next.unlockedFriends,
    next.stars,
  );
  return { profile: next, unlockedFriend };
}

function toPayload(
  profile: PreviewProfile,
  unlockedFriend: FriendId | null,
) {
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
    unlockedFriends: profile.unlockedFriends,
    unlockedFriend: milestone ? unlockedFriend : null,
  };
}
