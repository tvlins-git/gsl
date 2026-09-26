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
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-5 px-4 py-8">
      <PipBird className="size-24" />
      <h1 className="text-4xl font-extrabold text-[#2c2416]">Pip</h1>
      <div className="grid grid-cols-3 gap-2">
        {LANGUAGES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={ui === item}
            className={`min-h-12 rounded-2xl text-sm font-extrabold ${
              ui === item
                ? "bg-[#2a9d8f] text-white"
                : "bg-white text-[#2c2416] ring-2 ring-[#edd9bc]"
            }`}
            onClick={() => setUi(item)}
          >
            {labels[item]}
          </button>
        ))}
      </div>
      {preview ? (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#6d5c48] ring-1 ring-[#edd9bc]">
          {copy.preview}
        </p>
      ) : null}
      <p className="text-lg text-[#6d5c48]">{copy.codeHelp}</p>
      <label className="flex flex-col gap-2 text-lg font-bold text-[#2c2416]">
        {copy.familyCode}
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="h-14 rounded-2xl bg-white px-4 text-xl tracking-widest"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      {error ? <p className="font-bold text-[#c4483a]">{error}</p> : null}
      <Button
        className="h-14 rounded-full text-lg font-extrabold"
        disabled={pending}
        onClick={() => void submit()}
      >
        {copy.start}
      </Button>
    </main>
  );
}
