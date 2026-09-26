"use client";

import { PipBird } from "@/components/pip-bird";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LearningLanguage } from "@/games/types";
import { LANGUAGES, t } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

function suggestCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const labels: Record<LearningLanguage, string> = {
  sv: "Svenska",
  da: "Dansk",
  en: "English",
};

export function EnterScreen({ preview }: { preview: boolean }) {
  const [ui, setUi] = useState<LearningLanguage>("sv");
  const copy = t(ui);
  const router = useRouter();
  const suggested = useMemo(() => suggestCode(), []);
  const [mode, setMode] = useState<"create" | "enter">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState(suggested);
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        code,
        displayName: name,
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    setPending(false);
    if (!response.ok) {
      setError(
        data?.error === "name"
          ? copy.needName
          : data?.error === "code" && response.status === 400
            ? copy.shortCode
            : copy.wrongCode,
      );
      return;
    }
    if (mode === "create") {
      setSavedCode(code.trim().toLowerCase());
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (savedCode) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center gap-6 px-4 py-8">
        <PipBird className="size-24" />
        <h1 className="text-3xl font-extrabold text-[#2c2416]">
          {copy.familyCode}
        </h1>
        <p className="text-lg text-[#6d5c48]">{copy.codeHelp}</p>
        <p className="rounded-3xl bg-white px-4 py-6 text-center text-4xl font-black tracking-[0.3em] text-[#2c2416] ring-2 ring-[#edd9bc]">
          {savedCode}
        </p>
        <Button
          className="h-14 rounded-full text-lg font-extrabold"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
        >
          {copy.saveCode}
        </Button>
      </main>
    );
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={mode === "create"}
          className={`min-h-14 rounded-2xl font-extrabold ${
            mode === "create"
              ? "bg-[#2a9d8f] text-white"
              : "bg-white text-[#2c2416] ring-2 ring-[#edd9bc]"
          }`}
          onClick={() => setMode("create")}
        >
          {copy.firstTime}
        </button>
        <button
          type="button"
          aria-pressed={mode === "enter"}
          className={`min-h-14 rounded-2xl font-extrabold ${
            mode === "enter"
              ? "bg-[#2a9d8f] text-white"
              : "bg-white text-[#2c2416] ring-2 ring-[#edd9bc]"
          }`}
          onClick={() => setMode("enter")}
        >
          {copy.haveCode}
        </button>
      </div>
      {mode === "create" ? (
        <label className="flex flex-col gap-2 text-lg font-bold text-[#2c2416]">
          {copy.herName}
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-14 rounded-2xl bg-white px-4 text-xl"
            autoComplete="nickname"
          />
        </label>
      ) : null}
      <label className="flex flex-col gap-2 text-lg font-bold text-[#2c2416]">
        {copy.familyCode}
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="h-14 rounded-2xl bg-white px-4 text-xl tracking-widest"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
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
