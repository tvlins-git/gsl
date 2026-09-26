import { createHash } from "node:crypto";

const CODE_PATTERN = /^[a-z0-9-]{6,40}$/;

export function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

export function validateCode(code: string) {
  const normalized = normalizeCode(code);
  return (
    CODE_PATTERN.test(normalized) && normalized.replace(/-/g, "").length >= 6
  );
}

export function validateName(name: string) {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 24;
}

export function emailForCode(code: string) {
  const hash = createHash("sha256").update(normalizeCode(code)).digest("hex");
  return `pip.${hash.slice(0, 32)}@learner.pip.app`;
}
