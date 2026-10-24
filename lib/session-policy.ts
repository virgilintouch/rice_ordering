export const LOGIN_REQUIRED_MESSAGE = "请先登录";
export const LOGIN_FAILED_MESSAGE = "用户名或密码不正确";

export const SESSION_COOKIE_NAME = "rice_session";

/** Absolute lifetime of a login seal. Not refreshed by later requests. */
export const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

const CLOCK_SKEW_MS = 60_000;

/** Secure in production unless SESSION_COOKIE_SECURE is explicitly false (local `next start` over HTTP). */
export function cookieIsSecure(nodeEnv: string | undefined, flag: string | undefined): boolean {
  if (flag === "true") return true;
  if (flag === "false") return false;
  return nodeEnv === "production";
}

export function sessionSecretError(secret: string): string | null {
  if (secret.length < 32) return "会话密钥未配置";
  return null;
}

export function sessionIsActive(loginAt: number, now: number): boolean {
  if (!Number.isFinite(loginAt) || !Number.isFinite(now)) return false;
  if (loginAt > now + CLOCK_SKEW_MS) return false;
  return now - loginAt < SESSION_TTL_MS;
}

export type SessionRole = "admin" | "operator";

export type SessionPayload = {
  userId: number;
  username: string;
  displayName: string;
  role: SessionRole;
  loginAt: number;
};

export function parseSession(data: unknown, now: number): SessionPayload | null {
  if (typeof data !== "object" || data === null) return null;
  const row = data as Record<string, unknown>;
  const userId = typeof row.userId === "number" ? row.userId : Number.NaN;
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;
  if (typeof row.username !== "string" || row.username.length === 0 || row.username.length > 64) {
    return null;
  }
  if (typeof row.displayName !== "string" || row.displayName.length > 64) return null;
  if (row.role !== "admin" && row.role !== "operator") return null;
  if (typeof row.loginAt !== "number" || !sessionIsActive(row.loginAt, now)) return null;
  return {
    userId,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    loginAt: row.loginAt,
  };
}

/** Post-login redirect. Only same-site paths; never `/login` (avoids a loop). */
export function safeNextPath(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("\0") || value.length > 512) return null;
  let url: URL;
  try {
    url = new URL(value, "http://127.0.0.1");
  } catch {
    return null;
  }
  if (url.origin !== "http://127.0.0.1") return null;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return null;
  if (url.username || url.password) return null;
  return `${url.pathname}${url.search}`;
}

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  if (!name || name.length > 64) return null;
  if (/[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}
