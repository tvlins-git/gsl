import { GATE_COOKIE, gateTokenValid } from "@/lib/access-gate";
import { NextResponse, type NextRequest } from "next/server";

const OPEN_PATHS = new Set(["/enter", "/api/auth/start", "/api/auth/signout"]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const allowed = gateTokenValid(request.cookies.get(GATE_COOKIE)?.value);

  if (allowed && path === "/enter") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  if (!allowed && !OPEN_PATHS.has(path)) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "signed_out", message: "Enter the code first." },
        { status: 401 },
      );
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/enter";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
