import { ConnectedGame, Shell } from "@/components/shell";
import AlphabetGame from "@/games/language/AlphabetGame";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function AlphabetPage() {
  const profile = await requireProfile();
  return (
    <Shell profile={profile} activity="alphabet" backHref="/language">
      <ConnectedGame game={AlphabetGame} />
    </Shell>
  );
}
