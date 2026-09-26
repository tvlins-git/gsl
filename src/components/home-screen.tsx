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
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3">
        <PipBird className="size-20" />
        <h1 className="text-4xl font-extrabold text-[#2c2416]">
          {copy.hello} {profile.displayName}
        </h1>
      </div>
      <LanguageSwitch />
      <div className="grid flex-1 gap-4 sm:grid-cols-2">
        <Link
          href="/math"
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-[2rem] bg-[#e36a5d] text-white shadow-sm"
        >
          <span className="flex items-center text-5xl font-black">
            <Plus className="size-12" strokeWidth={3} />
            <Minus className="size-12" strokeWidth={3} />
          </span>
          <span className="text-3xl font-extrabold">{copy.math}</span>
        </Link>
        <Link
          href="/language"
          className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-[2rem] bg-[#2a9d8f] text-white shadow-sm"
        >
          <BookOpen className="size-14" strokeWidth={2.4} />
          <span className="text-3xl font-extrabold">{copy.language}</span>
        </Link>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="self-center px-3 py-2 text-sm font-bold text-[#6d5c48] underline-offset-4 hover:underline"
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
