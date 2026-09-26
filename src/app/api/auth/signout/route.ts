import { GATE_COOKIE } from "@/lib/access-gate";
import { PREVIEW_COOKIE } from "@/lib/preview";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  if (supabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Closing the access cookie is what locks the app.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, "", { path: "/", maxAge: 0 });
  response.cookies.set(PREVIEW_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
