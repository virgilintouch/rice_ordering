import { query } from "@/lib/db";
import { dummyPasswordHash, verifyPassword } from "@/lib/password";
import { logServerError, PublicError } from "@/lib/public-error";
import type { AuthUser } from "@/lib/current-user";
import { normalizeUsername, type SessionRole } from "@/lib/session-policy";

type LoginRow = {
  id: string | number;
  username: string;
  password_hash: string;
  display_name: string;
  role: string;
  status: string;
};

function dbId(value: string | number): number | null {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

/**
 * Checks `app_users.password_hash`. Wrong password, unknown user, and
 * disabled accounts all return null — callers show one generic message.
 * The hash never leaves this function.
 */
export async function authenticate(usernameRaw: string, password: string): Promise<AuthUser | null> {
  const username = normalizeUsername(usernameRaw);
  let row: LoginRow | null = null;

  if (username) {
    try {
      const rows = await query<LoginRow>(
        `SELECT id, username, password_hash, display_name, role, status
         FROM app_users
         WHERE username = $1`,
        [username],
      );
      row = rows[0] ?? null;
    } catch (error) {
      logServerError("authenticate", error);
      throw new PublicError("登录失败");
    }
  }

  const hash = row?.password_hash || (await dummyPasswordHash());
  const match = await verifyPassword(password, hash);
  if (!username || !row || row.status !== "active" || !match) return null;
  if (row.role !== "admin" && row.role !== "operator") return null;
  const id = dbId(row.id);
  if (id == null) return null;

  try {
    const updated = await query<{ id: string | number }>(
      `UPDATE app_users
       SET last_login_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id`,
      [id],
    );
    if (!updated[0]) return null;
  } catch (error) {
    logServerError("last_login", error);
    throw new PublicError("登录失败");
  }

  const role: SessionRole = row.role === "admin" ? "admin" : "operator";
  return {
    id,
    username: row.username,
    displayName: row.display_name,
    role,
  };
}
