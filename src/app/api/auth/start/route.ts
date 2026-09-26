import {
  codeMatches,
  GATE_COOKIE,
  gateCookieOptions,
  gateToken,
} from "@/lib/access-gate";
import {
  emptyPreview,
  PREVIEW_COOKIE,
  previewCookieOptions,
  readPreview,
} from "@/lib/preview";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
  } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  const token = gateToken();
  if (!token || !codeMatches(code)) {
    return NextResponse.json(
      { error: "code", message: "That code did not match." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, token, gateCookieOptions());
  if (!(await readPreview())) {
    response.cookies.set(
      PREVIEW_COOKIE,
      JSON.stringify(emptyPreview("Pip")),
      previewCookieOptions(),
    );
  }
  return response;
}
