/**
 * Create an app_users row or replace that user's password.
 *
 *   node --experimental-strip-types scripts/set-app-user-password.ts <username> <password> [displayName] [admin|operator]
 *
 * Hashing matches lib/password.ts: bcrypt via bcryptjs, cost 10.
 * Loads .env.local then .env without overriding variables already in the environment.
 * Does not print the hash or the password.
 */
import { existsSync, readFileSync } from "node:fs";
import { hashPassword } from "../lib/password.ts";
import { getPool } from "../lib/db.ts";

function loadEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function usage(): never {
  console.error(
    "用法: node --experimental-strip-types scripts/set-app-user-password.ts <用户名> <密码> [显示名] [admin|operator]",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  loadEnv(".env.local");
  loadEnv(".env");

  const [, , usernameRaw, password, displayArg, roleArg] = process.argv;
  if (!usernameRaw || !password) usage();
  const username = usernameRaw.trim();
  if (!username || username.length > 64) {
    console.error("用户名需为 1–64 个字符");
    process.exit(1);
  }
  const role = roleArg ?? "admin";
  if (role !== "admin" && role !== "operator") {
    console.error("角色只能是 admin 或 operator");
    process.exit(1);
  }
  const displayName = (displayArg ?? username).trim();
  if (!displayName || displayName.length > 64) {
    console.error("显示名需为 1–64 个字符");
    process.exit(1);
  }

  let passwordHash: string;
  try {
    passwordHash = await hashPassword(password);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "密码无效");
    process.exit(1);
  }

  const pool = getPool();
  try {
    const updated = await pool.query<{ username: string }>(
      `UPDATE app_users
       SET password_hash = $2, updated_at = NOW()
       WHERE username = $1
       RETURNING username`,
      [username, passwordHash],
    );
    if (updated.rowCount) {
      console.log(`已更新密码：${updated.rows[0]?.username ?? username}`);
      return;
    }
    await pool.query(
      `INSERT INTO app_users (username, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4)`,
      [username, passwordHash, displayName, role],
    );
    console.log(`已创建账号：${username}（${role}）`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "23505") console.error("用户名已存在");
  else if (code === "42P01") console.error("数据表 app_users 不存在，请先执行迁移");
  else if (code === "ECONNREFUSED" || code === "ENOTFOUND") console.error("无法连接数据库");
  else console.error("设置密码失败");
  process.exit(1);
});
