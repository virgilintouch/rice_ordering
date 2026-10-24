import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { query } from "@/lib/db";
import { logServerError, PublicError } from "@/lib/public-error";
import { getSession } from "@/lib/session";
import {
  LOGIN_REQUIRED_MESSAGE,
  parseSession,
  sessionSecretError,
  type SessionRole,
} from "@/lib/session-policy";

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  role: SessionRole;
};

export type AuthState =
  | { kind: "anonymous" }
  | { kind: "active"; user: AuthUser }
  | { kind: "reject" };

type UserRow = {
  id: string | number;
  username: string;
  display_name: string;
  role: string;
  status: string;
};

function dbId(value: string | number): number | null {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

function toUser(row: UserRow): AuthUser | null {
  const id = dbId(row.id);
  if (id == null || row.status !== "active") return null;
  if (row.role !== "admin" && row.role !== "operator") return null;
  return {
    id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
  };
}

export const resolveAuth = cache(async (): Promise<AuthState> => {
  if (sessionSecretError(process.env.SESSION_SECRET ?? "")) return { kind: "anonymous" };

  let sealed: ReturnType<typeof parseSession> = null;
  try {
    const session = await getSession();
    sealed = parseSession(session, Date.now());
  } catch (error) {
    unstable_rethrow(error);
    logServerError("session", error);
    return { kind: "anonymous" };
  }
  if (!sealed) return { kind: "anonymous" };

  let rows: UserRow[];
  try {
    rows = await query<UserRow>(
      `SELECT id, username, display_name, role, status
       FROM app_users
       WHERE id = $1`,
      [sealed.userId],
    );
  } catch (error) {
    logServerError("resolveAuth", error);
    throw new PublicError("登录状态暂时无法确认");
  }

  const user = rows[0] ? toUser(rows[0]) : null;
  if (!user) return { kind: "reject" };
  return { kind: "active", user };
});

async function clearSession(): Promise<void> {
  try {
    const session = await getSession();
    session.destroy();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Cookies can only be modified")) return;
    logServerError("clear session", error);
  }
}

/** For mutating Server Actions. Missing, expired, or disabled accounts fail closed. */
export async function requireActiveUser(): Promise<AuthUser> {
  const auth = await resolveAuth();
  if (auth.kind === "active") return auth.user;
  if (auth.kind === "reject") await clearSession();
  throw new PublicError(LOGIN_REQUIRED_MESSAGE);
}
