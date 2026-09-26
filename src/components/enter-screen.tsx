"use client";

import { PipBird } from "@/components/pip-bird";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LearningLanguage } from "@/games/types";
import { LANGUAGES, t } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useState } from "react";

const labels: Record<LearningLanguage, string> = {
  sv: "Svenska",
  da: "Dansk",
  en: "English",
};

export function EnterScreen({ preview }: { preview: boolean }) {
  const [ui, setUi] = useState<LearningLanguage>("sv");
  const copy = t(ui);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setPending(false);
    if (!response.ok) {
      setError(copy.wrongCode);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="pip-cozy-hero mx-auto flex min-h-full w-full max-w-lg flex-col items-center justify-center gap-5 px-4 py-8 text-center">
      <p className="pip-brand text-6xl font-black tracking-tight text-[#5c3d24]">
        Pip
      </p>
      <PipBird className="size-36" animate="bob" />
      <div className="grid w-full grid-cols-3 gap-2">
        {LANGUAGES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={ui === item}
            className={`min-h-12 rounded-2xl text-sm font-extrabold ${
              ui === item
                ? "bg-[#c4894a] text-[#fff8e8]"
                : "bg-[#fff8e8] text-[#5c3d24] ring-2 ring-[#e8c9a0]"
            }`}
            onClick={() => setUi(item)}
          >
            {labels[item]}
          </button>
        ))}
      </div>
      {preview ? (
        <p className="w-full rounded-2xl bg-[#fff8e8]/80 px-4 py-3 text-left text-sm text-[#8b6a4a] ring-1 ring-[#e8c9a0]">
          {copy.preview}
        </p>
      ) : null}
      <p className="text-lg text-[#8b6a4a]">{copy.codeHelp}</p>
      <label className="flex w-full flex-col gap-2 text-left text-lg font-bold text-[#5c3d24]">
        {copy.familyCode}
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="h-14 rounded-2xl bg-[#fff8e8] px-4 text-xl tracking-widest"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      {error ? <p className="font-bold text-[#c4483a]">{error}</p> : null}
      <Button
        className="h-14 w-full rounded-full bg-[#c4894a] text-lg font-extrabold text-[#fff8e8] hover:bg-[#a06d45]"
        disabled={pending}
        onClick={() => void submit()}
      >
        {copy.start}
      </Button>
    </main>
  );
}
