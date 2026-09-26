import { EnterScreen } from "@/components/enter-screen";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default function EnterPage() {
  return <EnterScreen preview={!supabaseConfigured()} />;
}
