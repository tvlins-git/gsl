"use client";

import { FriendArt } from "@/components/friends";
import { PipBird } from "@/components/pip-bird";
import { RewardCelebration } from "@/components/reward-celebration";
import type { GameProps, LearningLanguage } from "@/games/types";
import { cheer, t } from "@/lib/i18n";
import type { FriendId } from "@/lib/friends";
import type { ShellProfile } from "@/lib/profile";
import { Star } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";

type ProgressPayload = {
  stars: number;
  currentStreak: number;
  bestStreak: number;
  milestone: number | null;
  unlockedFriends?: FriendId[];
  unlockedFriend?: FriendId | null;
};

type ShellContextValue = {
  profile: ShellProfile;
  language: LearningLanguage;
  onResult: GameProps["onResult"];
  setLanguage: (language: LearningLanguage) => Promise<void>;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell must be used inside Shell");
  return value;
}

export function ConnectedGame({
  game: Game,
}: {
  game: (props: GameProps) => React.ReactNode;
}) {
  const { language, onResult } = useShell();
  return <Game language={language} onResult={onResult} />;
}

export function Shell({
  profile: initialProfile,
  activity,
  backHref,
  children,
}: {
  profile: ShellProfile;
  activity?: "math" | "alphabet" | "word" | "story";
  backHref?: string;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [unlockedFriend, setUnlockedFriend] = useState<FriendId | null>(null);
  const [hop, setHop] = useState(false);
  const [pending, setPending] = useState(false);
  const copy = t(profile.language);

  useEffect(() => {
    document.documentElement.lang = profile.language;
  }, [profile.language]);

  async function setLanguage(language: LearningLanguage) {
    setProfile((current) => ({ ...current, language }));
    document.documentElement.lang = language;
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language }),
    });
  }

  async function onResult(result: { correct: boolean; promptId: string }) {
    if (!activity || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity,
          promptId: result.promptId,
          language: profile.language,
          correct: result.correct,
        }),
      });
      if (!response.ok) return;
      const data = (await response.json()) as ProgressPayload;
      setProfile((current) => ({
        ...current,
        stars: data.stars,
        currentStreak: data.currentStreak,
        bestStreak: data.bestStreak,
        unlockedFriends: data.unlockedFriends ?? current.unlockedFriends,
      }));
      if (result.correct) {
        setHop(true);
        window.setTimeout(() => setHop(false), 450);
      }
      if (data.milestone) {
        setMilestone(data.milestone);
        setUnlockedFriend(data.unlockedFriend ?? null);
        void playCheer(profile.language, data.milestone);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <ShellContext.Provider
      value={{ profile, language: profile.language, onResult, setLanguage }}
    >
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center gap-3">
          {backHref ? (
            <Link
              href={backHref}
              className="flex min-h-14 min-w-14 items-center justify-center rounded-full bg-[#fff8e8]/90 text-lg font-extrabold text-[#5c3d24] ring-2 ring-[#e8c9a0]"
              aria-label={copy.back}
            >
              ←
            </Link>
          ) : (
            <PipBird
              className={`size-14 ${hop ? "pip-hop" : ""}`}
              animate="bob"
            />
          )}
          <div className="ml-auto flex items-center gap-2">
            <p className="rounded-full bg-[#fff8e8]/90 px-4 py-2 text-lg font-extrabold text-[#5c3d24] ring-2 ring-[#e8c9a0]">
              <span className="text-[#c4894a]">{profile.currentStreak}</span>{" "}
              <span className="text-base font-bold text-[#8b6a4a]">
                {copy.inARow}
              </span>
            </p>
            <p className="flex min-h-12 items-center gap-1 rounded-full bg-[#f6d56a] px-4 text-lg font-extrabold text-[#5c3d24]">
              <Star className="size-5 fill-[#e8a050] text-[#e8a050]" />
              {profile.stars}
              <span className="sr-only">{copy.stars}</span>
            </p>
          </div>
        </header>
        {profile.preview ? (
          <p className="mb-4 rounded-2xl bg-[#fff8e8]/80 px-4 py-3 text-sm text-[#8b6a4a] ring-1 ring-[#e8c9a0]">
            {copy.preview}
          </p>
        ) : null}
        <main className="flex flex-1 flex-col">{children}</main>
        {!activity && profile.unlockedFriends.length > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-1 pb-2">
            {profile.unlockedFriends.map((id) => (
              <FriendArt
                key={id}
                id={id}
                className="size-12"
                animate={id === "pip" ? "bob" : "idle"}
              />
            ))}
          </div>
        ) : null}
      </div>
      <RewardCelebration
        open={milestone !== null}
        milestone={milestone}
        unlockedFriend={unlockedFriend}
        stars={profile.stars}
        language={profile.language}
        onClose={() => {
          setMilestone(null);
          setUnlockedFriend(null);
        }}
      />
    </ShellContext.Provider>
  );
}

async function playCheer(language: LearningLanguage, streak: number) {
  const response = await fetch("/api/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "speak",
      text: cheer(language, streak),
      language,
    }),
  });
  if (!response.ok) return;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play().catch(() => URL.revokeObjectURL(url));
}
