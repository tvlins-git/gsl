import { createHmac, timingSafeEqual } from "node:crypto";

export const GATE_COOKIE = "pip_gate";

const TOKEN_LABEL = "pip-gate-v1";

function accessCode() {
  const value = process.env.PIP_ACCESS_CODE?.trim();
  if (!value) return null;
  return value;
}

export function codeMatches(input: string) {
  const expected = accessCode();
  const given = input.trim();
  if (!expected || !given) return false;

  const a = createHmac("sha256", "pip-compare").update(given).digest();
  const b = createHmac("sha256", "pip-compare").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function gateToken() {
  const expected = accessCode();
  if (!expected) return null;
  return createHmac("sha256", expected).update(TOKEN_LABEL).digest("base64url");
}

export function gateTokenValid(token: string | undefined | null) {
  const expected = gateToken();
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function gateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
