"use client";

import { FriendArt } from "@/components/friends";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LearningLanguage } from "@/games/types";
import { FRIENDS, type FriendId } from "@/lib/friends";
import { cheer, friendUnlockLine, t } from "@/lib/i18n";
import { Star } from "lucide-react";

export function RewardCelebration({
  open,
  milestone,
  unlockedFriend,
  stars,
  language,
  onClose,
}: {
  open: boolean;
  milestone: number | null;
  unlockedFriend: FriendId | null;
  stars: number;
  language: LearningLanguage;
  onClose: () => void;
}) {
  const copy = t(language);
  const friend = FRIENDS.find((item) => item.id === unlockedFriend) ?? null;
  const friendName = friend?.names[language] ?? "Pip";

  return (
    <Dialog
      open={open}
      onOpenChange={(next: boolean) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="overflow-hidden border-0 bg-[#fff8e8] sm:max-w-md">
        <div className="reward-parade-stage relative flex flex-col items-center gap-3 py-5 text-center">
          <div className="reward-sparkles" aria-hidden="true" />
          <div className="flex items-end justify-center gap-2">
            {friend ? (
              <>
                <FriendArt
                  id="pip"
                  className="size-16 opacity-80"
                  animate="parade"
                />
                <FriendArt
                  id={friend.id}
                  className="size-32"
                  animate="bounce"
                />
              </>
            ) : (
              <FriendArt id="pip" className="size-28" animate="bob" />
            )}
          </div>
          <DialogTitle className="text-3xl font-extrabold text-[#5c3d24]">
            {milestone ? cheer(language, milestone) : ""}
          </DialogTitle>
          {friend ? (
            <p className="text-xl font-bold text-[#a06d45]">
              {friendUnlockLine(language, friendName)}
            </p>
          ) : null}
          <DialogDescription className="text-lg text-[#8b6a4a]">
            <Star className="mr-1 inline size-5 fill-[#e8a050] text-[#e8a050]" />
            {stars} {copy.stars}
          </DialogDescription>
          <Button
            className="mt-2 h-14 rounded-full bg-[#c4894a] px-8 text-lg font-extrabold text-[#fff8e8] hover:bg-[#a06d45]"
            onClick={onClose}
          >
            {copy.keepGoing}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
