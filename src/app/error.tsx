"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-full place-items-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <p className="text-2xl font-extrabold text-[#2c2416]">
          Pip snubblade. Försök igen.
        </p>
        <Button className="h-12 rounded-full px-6 font-extrabold" onClick={reset}>
          Igen
        </Button>
      </div>
    </main>
  );
}
