import { PREVIEW_COOKIE } from "@/lib/preview";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PREVIEW_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
