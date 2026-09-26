"use client";

import { useShell } from "@/components/shell";
import type { LearningLanguage } from "@/games/types";
import { LANGUAGES } from "@/lib/i18n";

const labels: Record<LearningLanguage, string> = {
  sv: "Svenska",
  da: "Dansk",
  en: "English",
};

export function LanguageSwitch() {
  const { language, setLanguage } = useShell();

  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Language">
      {LANGUAGES.map((item) => {
        const selected = item === language;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => void setLanguage(item)}
            className={`min-h-14 rounded-2xl text-base font-extrabold sm:text-lg ${
              selected
                ? "bg-[#c4894a] text-[#fff8e8]"
                : "bg-[#fff8e8]/90 text-[#5c3d24] ring-2 ring-[#e8c9a0]"
            }`}
          >
            {labels[item]}
          </button>
        );
      })}
    </div>
  );
}
