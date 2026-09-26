"use client";

import { PipBird } from "@/components/pip-bird";
import type { GameProps, LearningLanguage } from "@/games/types";
import { cheer, t } from "@/lib/i18n";
import type { ShellProfile } from "@/lib/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Star } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";

type ProgressPayload = {
  stars: number;
  currentStreak: number;
  bestStreak: number;
  milestone: number | null;
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
      }));
      if (result.correct) {
        setHop(true);
        window.setTimeout(() => setHop(false), 450);
      }
      if (data.milestone) {
        setMilestone(data.milestone);
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
              className="flex min-h-14 min-w-14 items-center justify-center rounded-full bg-white text-lg font-extrabold text-[#2c2416] ring-2 ring-[#edd9bc]"
              aria-label={copy.back}
            >
              ←
            </Link>
          ) : (
            <PipBird className={`size-14 ${hop ? "pip-hop" : ""}`} />
          )}
          <div className="ml-auto flex items-center gap-2">
            <p className="rounded-full bg-white px-4 py-2 text-lg font-extrabold text-[#2c2416] ring-2 ring-[#edd9bc]">
              <span className="text-[#e36a5d]">{profile.currentStreak}</span>{" "}
              <span className="text-base font-bold text-[#6d5c48]">
                {copy.inARow}
              </span>
            </p>
            <p className="flex min-h-12 items-center gap-1 rounded-full bg-[#f6d365] px-4 text-lg font-extrabold text-[#2c2416]">
              <Star className="size-5 fill-[#e36a5d] text-[#e36a5d]" />
              {profile.stars}
              <span className="sr-only">{copy.stars}</span>
            </p>
          </div>
        </header>
        {profile.preview ? (
          <p className="mb-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#6d5c48] ring-1 ring-[#edd9bc]">
            {copy.preview}
          </p>
        ) : null}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
      <Dialog
        open={milestone !== null}
        onOpenChange={(open) => {
          if (!open) setMilestone(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <PipBird className="pip-hop size-28" />
            <DialogTitle className="text-3xl font-extrabold">
              {milestone ? cheer(profile.language, milestone) : ""}
            </DialogTitle>
            <DialogDescription className="text-lg text-[#6d5c48]">
              <Star className="mr-1 inline size-5 fill-[#e36a5d] text-[#e36a5d]" />
              {profile.stars} {copy.stars}
            </DialogDescription>
            <Button
              className="mt-2 h-14 rounded-full px-8 text-lg font-extrabold"
              onClick={() => setMilestone(null)}
            >
              {copy.keepGoing}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
