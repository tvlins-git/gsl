// STUB: replaced by the game PR
"use client";

import type { GameProps } from "@/games/types";

export default function StoryGame({ language, onResult }: GameProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center">
      <p className="text-sm font-bold tracking-wide text-[#6d5c48] uppercase">
        {language}
      </p>
      <h1 className="text-4xl font-extrabold text-[#2c2416]">Story</h1>
      <p className="text-lg text-[#6d5c48]">This game is on its way.</p>
      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          className="min-h-16 rounded-3xl bg-[#2a9d8f] text-xl font-extrabold text-white"
          onClick={() => onResult({ correct: true, promptId: "stub-story" })}
        >
          Right
        </button>
        <button
          type="button"
          className="min-h-16 rounded-3xl bg-white text-xl font-extrabold text-[#2c2416] ring-2 ring-[#edd9bc]"
          onClick={() => onResult({ correct: false, promptId: "stub-story" })}
        >
          Not yet
        </button>
      </div>
    </div>
  );
}
