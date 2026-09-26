import { HomeScreen } from "@/components/home-screen";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireProfile();
  return (
    <Shell profile={profile}>
      <HomeScreen />
    </Shell>
  );
}
