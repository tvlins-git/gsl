import type { FriendId } from "@/lib/friends";
import type { ReactNode } from "react";

type FriendArtProps = {
  className?: string;
  animate?: "idle" | "bob" | "bounce" | "parade";
};

function wrap(
  className: string,
  animate: FriendArtProps["animate"],
  children: ReactNode,
) {
  const motion =
    animate === "bob"
      ? "friend-beret-bob"
      : animate === "bounce"
        ? "friend-unlock-bounce"
        : animate === "parade"
          ? "friend-parade"
          : "";
  return (
    <svg
      viewBox="0 0 120 120"
      className={`${className} ${motion}`.trim()}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Soft yellow pudding-dog with a brown beret — original drawing. */
export function PipFriend({
  className = "",
  animate = "idle",
}: FriendArtProps) {
  return wrap(
    className,
    animate,
    <>
      <ellipse cx="60" cy="108" rx="30" ry="6" fill="#e8c9a0" opacity="0.55" />
      <ellipse cx="60" cy="72" rx="38" ry="32" fill="#f6d56a" />
      <ellipse cx="60" cy="78" rx="28" ry="22" fill="#ffe9a8" />
      <ellipse cx="38" cy="58" rx="12" ry="14" fill="#f6d56a" />
      <ellipse cx="82" cy="58" rx="12" ry="14" fill="#f6d56a" />
      <ellipse cx="38" cy="58" rx="7" ry="8" fill="#f0c85a" />
      <ellipse cx="82" cy="58" rx="7" ry="8" fill="#f0c85a" />
      <g className="friend-beret">
        <ellipse cx="58" cy="42" rx="28" ry="12" fill="#8b5e3c" />
        <ellipse cx="58" cy="38" rx="22" ry="8" fill="#a06d45" />
        <circle cx="78" cy="36" r="5" fill="#6f452c" />
      </g>
      <circle cx="48" cy="70" r="4.5" fill="#3a2a1a" />
      <circle cx="72" cy="70" r="4.5" fill="#3a2a1a" />
      <circle cx="49.5" cy="68.5" r="1.4" fill="#fff8e8" />
      <circle cx="73.5" cy="68.5" r="1.4" fill="#fff8e8" />
      <ellipse cx="60" cy="80" rx="7" ry="5" fill="#e8a070" />
      <path
        d="M48 88c6 6 18 6 24 0"
        fill="none"
        stroke="#3a2a1a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="42" cy="84" rx="6" ry="3.5" fill="#f3b889" opacity="0.7" />
      <ellipse cx="78" cy="84" rx="6" ry="3.5" fill="#f3b889" opacity="0.7" />
    </>,
  );
}

/** Soft peach bunny friend. */
export function MochiFriend({
  className = "",
  animate = "idle",
}: FriendArtProps) {
  return wrap(
    className,
    animate,
    <>
      <ellipse cx="60" cy="108" rx="28" ry="6" fill="#e8c9a0" opacity="0.45" />
      <ellipse cx="42" cy="34" rx="10" ry="22" fill="#f7c4a8" />
      <ellipse cx="78" cy="34" rx="10" ry="22" fill="#f7c4a8" />
      <ellipse cx="42" cy="34" rx="5" ry="14" fill="#f3a888" />
      <ellipse cx="78" cy="34" rx="5" ry="14" fill="#f3a888" />
      <ellipse cx="60" cy="72" rx="34" ry="30" fill="#fad2bc" />
      <ellipse cx="60" cy="78" rx="24" ry="20" fill="#ffe6d8" />
      <circle cx="48" cy="68" r="4" fill="#3a2a1a" />
      <circle cx="72" cy="68" r="4" fill="#3a2a1a" />
      <ellipse cx="60" cy="78" rx="6" ry="4.5" fill="#e89a7a" />
      <path
        d="M50 88c5 4 15 4 20 0"
        fill="none"
        stroke="#3a2a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Caramel-brown kitty friend. */
export function CaramelFriend({
  className = "",
  animate = "idle",
}: FriendArtProps) {
  return wrap(
    className,
    animate,
    <>
      <ellipse cx="60" cy="108" rx="28" ry="6" fill="#e8c9a0" opacity="0.45" />
      <path d="M28 48l14 18-18 4z" fill="#c4894a" />
      <path d="M92 48l-14 18 18 4z" fill="#c4894a" />
      <ellipse cx="60" cy="72" rx="34" ry="30" fill="#d4a06a" />
      <ellipse cx="60" cy="78" rx="22" ry="18" fill="#f3e0c4" />
      <circle cx="48" cy="68" r="4" fill="#3a2a1a" />
      <circle cx="72" cy="68" r="4" fill="#3a2a1a" />
      <path d="M56 76c2 3 6 3 8 0" fill="none" stroke="#3a2a1a" strokeWidth="2" />
      <path
        d="M50 88c5 4 15 4 20 0"
        fill="none"
        stroke="#3a2a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M22 78c10 2 16 6 18 12"
        fill="none"
        stroke="#c4894a"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Gentle peach chick friend. */
export function PeachFriend({
  className = "",
  animate = "idle",
}: FriendArtProps) {
  return wrap(
    className,
    animate,
    <>
      <ellipse cx="60" cy="108" rx="26" ry="5" fill="#e8c9a0" opacity="0.45" />
      <ellipse cx="60" cy="70" rx="32" ry="30" fill="#f7b98a" />
      <ellipse cx="60" cy="76" rx="22" ry="18" fill="#ffd7b8" />
      <ellipse cx="88" cy="62" rx="12" ry="10" fill="#f7b98a" />
      <path d="M96 58c8 1 12 6 10 10-6 1-12-1-16-6z" fill="#e8895a" />
      <circle cx="50" cy="66" r="4" fill="#3a2a1a" />
      <circle cx="70" cy="66" r="4" fill="#3a2a1a" />
      <ellipse cx="60" cy="76" rx="5" ry="3.5" fill="#e8895a" />
      <path
        d="M48 90c6 5 18 5 24 0"
        fill="none"
        stroke="#3a2a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </>,
  );
}

/** Cream custard bear friend. */
export function CustardFriend({
  className = "",
  animate = "idle",
}: FriendArtProps) {
  return wrap(
    className,
    animate,
    <>
      <ellipse cx="60" cy="108" rx="28" ry="6" fill="#e8c9a0" opacity="0.45" />
      <circle cx="34" cy="48" r="14" fill="#f3e0b8" />
      <circle cx="86" cy="48" r="14" fill="#f3e0b8" />
      <ellipse cx="60" cy="72" rx="34" ry="30" fill="#f6e4b8" />
      <ellipse cx="60" cy="78" rx="22" ry="18" fill="#fff6de" />
      <circle cx="48" cy="68" r="4" fill="#3a2a1a" />
      <circle cx="72" cy="68" r="4" fill="#3a2a1a" />
      <ellipse cx="60" cy="78" rx="6" ry="4.5" fill="#e0b070" />
      <path
        d="M50 88c5 4 15 4 20 0"
        fill="none"
        stroke="#3a2a1a"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M52 44c4-6 12-6 16 0"
        fill="none"
        stroke="#c4894a"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>,
  );
}

export function FriendArt({
  id,
  className = "",
  animate = "idle",
}: {
  id: FriendId;
  className?: string;
  animate?: FriendArtProps["animate"];
}) {
  switch (id) {
    case "mochi":
      return <MochiFriend className={className} animate={animate} />;
    case "caramel":
      return <CaramelFriend className={className} animate={animate} />;
    case "peach":
      return <PeachFriend className={className} animate={animate} />;
    case "custard":
      return <CustardFriend className={className} animate={animate} />;
    default:
      return <PipFriend className={className} animate={animate} />;
  }
}
