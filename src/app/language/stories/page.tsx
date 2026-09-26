import { ConnectedGame, Shell } from "@/components/shell";
import StoryGame from "@/games/language/StoryGame";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const profile = await requireProfile();
  return (
    <Shell profile={profile} activity="story" backHref="/language">
      <ConnectedGame game={StoryGame} />
    </Shell>
  );
}
