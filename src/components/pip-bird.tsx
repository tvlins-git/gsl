import { PipFriend } from "@/components/friends";

/** Pip companion — soft pudding-dog with a brown beret. */
export function PipBird({
  className = "",
  animate = "idle",
}: {
  className?: string;
  animate?: "idle" | "bob" | "bounce" | "parade";
}) {
  return <PipFriend className={className} animate={animate} />;
}
