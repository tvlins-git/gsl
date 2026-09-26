import type { LearningLanguage } from "@/games/types";
import {
  friendIdsForStars,
  mergeUnlockedFriends,
  type FriendId,
} from "@/lib/friends";
import { isLearningLanguage } from "@/lib/i18n";
import { emptyPreview, readPreview } from "@/lib/preview";
import { hasGate } from "@/lib/require-gate";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ShellProfile = {
  id: string;
  displayName: string;
  language: LearningLanguage;
  stars: number;
  currentStreak: number;
  bestStreak: number;
  mathLevel: number;
  mathCorrect: number;
  unlockedFriends: FriendId[];
  preview: boolean;
};

function localProfile(preview: Awaited<ReturnType<typeof readPreview>>) {
  const base = preview ?? emptyPreview("Pip");
  return {
    ...base,
    unlockedFriends: mergeUnlockedFriends(base.unlockedFriends, base.stars),
    preview: true as const,
  };
}

export async function requireProfile(): Promise<ShellProfile> {
  if (!(await hasGate())) redirect("/enter");

  if (!supabaseConfigured()) {
    return localProfile(await readPreview());
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return localProfile(await readPreview());

  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, language, stars, current_streak, best_streak, math_level, math_correct",
    )
    .eq("id", user.id)
    .single();

  if (!data || !isLearningLanguage(data.language)) {
    return localProfile(await readPreview());
  }

  return {
    id: data.id,
    displayName: data.display_name,
    language: data.language,
    stars: data.stars,
    currentStreak: data.current_streak,
    bestStreak: data.best_streak,
    mathLevel: data.math_level,
    mathCorrect: data.math_correct,
    unlockedFriends: friendIdsForStars(data.stars),
    preview: false,
  };
}
