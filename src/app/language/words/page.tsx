import { ConnectedGame, Shell } from "@/components/shell";
import WordGame from "@/games/language/WordGame";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function WordsPage() {
  const profile = await requireProfile();
  return (
    <Shell profile={profile} activity="word" backHref="/language">
      <ConnectedGame game={WordGame} />
    </Shell>
  );
}
