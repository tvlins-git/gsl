"use client";

import { LanguageSwitch } from "@/components/language-switch";
import { useShell } from "@/components/shell";
import { t } from "@/lib/i18n";
import Link from "next/link";

export function LanguageHome() {
  const { language } = useShell();
  const copy = t(language);
  const cards = [
    { href: "/language/alphabet", label: copy.letters, mark: "A" },
    { href: "/language/words", label: copy.words, mark: "hund" },
    { href: "/language/stories", label: copy.stories, mark: "…" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-4xl font-extrabold text-[#5c3d24]">{copy.language}</h1>
      <LanguageSwitch />
      <div className="grid gap-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex min-h-24 items-center gap-4 rounded-[2rem] bg-[#fff8e8]/90 px-5 ring-2 ring-[#e8c9a0]"
          >
            <span className="flex size-16 items-center justify-center rounded-2xl bg-[#ffe0c2] text-2xl font-black text-[#5c3d24]">
              {card.mark}
            </span>
            <span className="text-2xl font-extrabold text-[#5c3d24]">
              {card.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
