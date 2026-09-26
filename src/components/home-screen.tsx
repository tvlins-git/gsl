"use client";

import { LanguageSwitch } from "@/components/language-switch";
import { PipBird } from "@/components/pip-bird";
import { useShell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { BookOpen, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function HomeScreen() {
  const { profile } = useShell();
  const copy = t(profile.language);
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/enter");
    router.refresh();
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="pip-cozy-hero flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <p className="pip-brand text-6xl font-black tracking-tight text-[#5c3d24] sm:text-7xl">
          Pip
        </p>
        <PipBird className="size-40 sm:size-48" animate="bob" />
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-[#5c3d24] sm:text-4xl">
            {copy.hello} {profile.displayName}
          </h1>
          <p className="mx-auto max-w-sm text-base font-semibold text-[#8b6a4a]">
            {copy.playLanguage}
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
          <Link
            href="/math"
            className="flex min-h-20 flex-1 items-center justify-center gap-3 rounded-full bg-[#e8895a] px-6 text-white shadow-[0_8px_0_#c46a3a] transition-transform active:translate-y-1 active:shadow-none"
          >
            <span className="flex items-center font-black">
              <Plus className="size-7" strokeWidth={3} />
              <Minus className="size-7" strokeWidth={3} />
            </span>
            <span className="text-2xl font-extrabold">{copy.math}</span>
          </Link>
          <Link
            href="/language"
            className="flex min-h-20 flex-1 items-center justify-center gap-3 rounded-full bg-[#c4894a] px-6 text-white shadow-[0_8px_0_#8b5e3c] transition-transform active:translate-y-1 active:shadow-none"
          >
            <BookOpen className="size-8" strokeWidth={2.4} />
            <span className="text-2xl font-extrabold">{copy.language}</span>
          </Link>
        </div>
        <LanguageSwitch />
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="self-center px-3 py-2 text-sm font-bold text-[#8b6a4a] underline-offset-4 hover:underline"
          >
            {copy.grownUp}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="text-2xl font-extrabold">
            {copy.grownUp}
          </DialogTitle>
          <DialogDescription className="text-base">
            {copy.signOutHint}
          </DialogDescription>
          <Button
            variant="outline"
            className="h-12 text-base font-bold"
            disabled={leaving}
            onClick={() => void signOut()}
          >
            {copy.signOut}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
