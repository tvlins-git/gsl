export type FriendId = "pip" | "mochi" | "caramel" | "peach" | "custard";

export type Friend = {
  id: FriendId;
  /** Stars needed before this friend appears. Pip is always free. */
  unlockAt: number;
  names: { sv: string; da: string; en: string };
};

export const FRIENDS: Friend[] = [
  {
    id: "pip",
    unlockAt: 0,
    names: { sv: "Pip", da: "Pip", en: "Pip" },
  },
  {
    id: "mochi",
    unlockAt: 1,
    names: { sv: "Mochi", da: "Mochi", en: "Mochi" },
  },
  {
    id: "caramel",
    unlockAt: 2,
    names: { sv: "Karamell", da: "Karamel", en: "Caramel" },
  },
  {
    id: "peach",
    unlockAt: 3,
    names: { sv: "Persika", da: "Fersken", en: "Peach" },
  },
  {
    id: "custard",
    unlockAt: 4,
    names: { sv: "Vanilj", da: "Vanille", en: "Custard" },
  },
];

const FRIEND_IDS = new Set<string>(FRIENDS.map((friend) => friend.id));

export function isFriendId(value: string): value is FriendId {
  return FRIEND_IDS.has(value);
}

export function friendsForStars(stars: number): Friend[] {
  return FRIENDS.filter((friend) => stars >= friend.unlockAt);
}

export function friendIdsForStars(stars: number): FriendId[] {
  return friendsForStars(stars).map((friend) => friend.id);
}

/** Friend unlocked by reaching this star count, if any. */
export function friendUnlockedAt(stars: number): Friend | null {
  return FRIENDS.find((friend) => friend.unlockAt === stars) ?? null;
}

export function mergeUnlockedFriends(
  stored: string[] | undefined,
  stars: number,
): FriendId[] {
  const fromStars = friendIdsForStars(stars);
  const fromStore = (stored ?? []).filter(isFriendId);
  return Array.from(new Set([...fromStars, ...fromStore]));
}
