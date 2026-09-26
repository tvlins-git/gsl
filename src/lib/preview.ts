import type { LearningLanguage } from "@/games/types";
import { isLearningLanguage } from "@/lib/i18n";
import { cookies } from "next/headers";

export const PREVIEW_COOKIE = "pip_preview";

export type PreviewProfile = {
  id: "preview";
  displayName: string;
  language: LearningLanguage;
  stars: number;
  currentStreak: number;
  bestStreak: number;
  mathLevel: number;
  mathCorrect: number;
};

export function emptyPreview(displayName: string): PreviewProfile {
  return {
    id: "preview",
    displayName: displayName.trim() || "Pip",
    language: "sv",
    stars: 0,
    currentStreak: 0,
    bestStreak: 0,
    mathLevel: 1,
    mathCorrect: 0,
  };
}

export async function readPreview(): Promise<PreviewProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PreviewProfile>;
    if (!parsed.displayName || !parsed.language) return null;
    if (!isLearningLanguage(parsed.language)) return null;
    return {
      id: "preview",
      displayName: parsed.displayName,
      language: parsed.language,
      stars: parsed.stars ?? 0,
      currentStreak: parsed.currentStreak ?? 0,
      bestStreak: parsed.bestStreak ?? 0,
      mathLevel: parsed.mathLevel ?? 1,
      mathCorrect: parsed.mathCorrect ?? 0,
    };
  } catch {
    return null;
  }
}

export function previewCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
