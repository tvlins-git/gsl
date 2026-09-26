import { GATE_COOKIE, gateTokenValid } from "@/lib/access-gate";
import { cookies } from "next/headers";

export async function hasGate() {
  const store = await cookies();
  return gateTokenValid(store.get(GATE_COOKIE)?.value);
}
