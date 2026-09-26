import { LanguageHome } from "@/components/language-home";
import { Shell } from "@/components/shell";
import { requireProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function LanguagePage() {
  const profile = await requireProfile();
  return (
    <Shell profile={profile} backHref="/">
      <LanguageHome />
    </Shell>
  );
}
