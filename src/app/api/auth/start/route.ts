import { emailForCode, normalizeCode, validateCode, validateName } from "@/lib/family-code";
import {
  emptyPreview,
  PREVIEW_COOKIE,
  previewCookieOptions,
} from "@/lib/preview";
import { createAdmin } from "@/lib/supabase/admin";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    mode?: string;
    code?: string;
    displayName?: string;
  } | null;

  const mode = body?.mode === "create" ? "create" : "enter";
  const code = normalizeCode(body?.code ?? "");
  const displayName = (body?.displayName ?? "").trim();

  if (!validateCode(code)) {
    return NextResponse.json(
      { error: "code", message: "The code needs at least 6 characters." },
      { status: 400 },
    );
  }

  if (!supabaseConfigured()) {
    if (mode === "create" && !validateName(displayName)) {
      return NextResponse.json(
        { error: "name", message: "Write her name." },
        { status: 400 },
      );
    }
    const response = NextResponse.json({ ok: true, preview: true });
    response.cookies.set(
      PREVIEW_COOKIE,
      JSON.stringify(emptyPreview(displayName || "Pip")),
      previewCookieOptions(),
    );
    return response;
  }

  const supabase = await createClient();
  const email = emailForCode(code);
  const existing = await supabase.auth.signInWithPassword({
    email,
    password: code,
  });

  if (!existing.error) {
    return NextResponse.json({ ok: true, preview: false });
  }

  if (mode !== "create" || !validateName(displayName)) {
    return NextResponse.json(
      { error: "code", message: "That code did not match." },
      { status: 401 },
    );
  }

  const admin = createAdmin();
  if (admin) {
    const created = await admin.auth.admin.createUser({
      email,
      password: code,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (created.error && !created.error.message.toLowerCase().includes("already")) {
      return NextResponse.json(
        { error: "create", message: "Pip could not save that code." },
        { status: 400 },
      );
    }
  } else {
    const created = await supabase.rpc("start_family", {
      p_code: code,
      p_name: displayName,
    });
    if (created.error) {
      return NextResponse.json(
        { error: "create", message: "Pip could not save that code." },
        { status: 400 },
      );
    }
  }

  const signedIn = await supabase.auth.signInWithPassword({
    email,
    password: code,
  });
  if (signedIn.error) {
    return NextResponse.json(
      { error: "code", message: "That code did not match." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true, preview: false });
}
