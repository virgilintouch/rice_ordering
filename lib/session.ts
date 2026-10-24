import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions } from "@/lib/session-config";
import type { SessionPayload } from "@/lib/session-policy";

export async function getSession(): Promise<IronSession<SessionPayload>> {
  return getIronSession<SessionPayload>(await cookies(), sessionOptions());
}
