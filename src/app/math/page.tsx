import { ConnectedGame, Shell } from "@/components/shell";
import MathGame from "@/games/math/MathGame";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function MathPage() {
  const profile = await requireProfile();
  return (
    <Shell profile={profile} activity="math" backHref="/">
      <ConnectedGame game={MathGame} />
    </Shell>
  );
}
