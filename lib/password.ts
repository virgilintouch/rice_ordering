import { compare, hash } from "bcryptjs";

/** bcrypt cost. bcryptjs emits `$2a$10$…` or `$2b$10$…`, readable by other bcrypt implementations. */
export const BCRYPT_COST = 10;

/** bcrypt only uses the first 72 bytes. Reject longer input instead of silently truncating. */
export const PASSWORD_MAX_LENGTH = 72;

export async function hashPassword(password: string): Promise<string> {
  if (!password) throw new Error("密码为必填");
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(`密码不能超过 ${PASSWORD_MAX_LENGTH} 个字符`);
  }
  return hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!password || password.length > PASSWORD_MAX_LENGTH) return false;
  if (!passwordHash.startsWith("$2")) return false;
  try {
    return await compare(password, passwordHash);
  } catch {
    return false;
  }
}

let dummyHash: string | null = null;

/**
 * Valid bcrypt hash used when the username does not exist, so the failure
 * path still pays for a compare. Not a credential.
 */
export async function dummyPasswordHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await hash("dummy-password-not-a-credential", BCRYPT_COST);
  }
  return dummyHash;
}
