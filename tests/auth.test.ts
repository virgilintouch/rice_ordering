import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "../lib/password.ts";
import {
  LOGIN_REQUIRED_MESSAGE,
  SESSION_TTL_MS,
  cookieIsSecure,
  normalizeUsername,
  parseSession,
  safeNextPath,
  sessionIsActive,
  sessionSecretError,
} from "../lib/session-policy.ts";

describe("passwords", () => {
  it("stores a bcrypt hash at cost 10 and verifies it", async () => {
    const hash = await hashPassword("correct horse");
    assert.match(hash, /^\$2[ab]\$10\$/);
    assert.equal(await verifyPassword("correct horse", hash), true);
    assert.equal(await verifyPassword("wrong", hash), false);
  });

  it("rejects empty, overlong, and malformed hashes", async () => {
    await assert.rejects(() => hashPassword(""), /密码/);
    await assert.rejects(() => hashPassword("x".repeat(73)), /密码/);
    assert.equal(await verifyPassword("", "$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuuabcde"), false);
    assert.equal(await verifyPassword("secret", "not-a-hash"), false);
    assert.equal(await verifyPassword("x".repeat(73), "$2a$10$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuuabcde"), false);
  });
});

describe("session policy", () => {
  const loginAt = 1_700_000_000_000;

  it("stays active until the absolute 12 hour mark", () => {
    assert.equal(SESSION_TTL_MS, 12 * 60 * 60 * 1000);
    assert.equal(sessionIsActive(loginAt, loginAt + SESSION_TTL_MS - 1), true);
    assert.equal(sessionIsActive(loginAt, loginAt + SESSION_TTL_MS), false);
    assert.equal(sessionIsActive(loginAt, loginAt - 120_000), false);
    assert.equal(sessionIsActive(Number.NaN, loginAt), false);
  });

  it("allows only same-site relative paths after login", () => {
    assert.equal(safeNextPath("/orders"), "/orders");
    assert.equal(safeNextPath("/orders/12?status=paid"), "/orders/12?status=paid");
    assert.equal(safeNextPath(""), null);
    assert.equal(safeNextPath("https://evil.example/orders"), null);
    assert.equal(safeNextPath("//evil.example"), null);
    assert.equal(safeNextPath("/\\evil"), null);
    assert.equal(safeNextPath("/login"), null);
    assert.equal(safeNextPath("/login?next=/orders"), null);
  });

  it("marks the cookie Secure in production unless local HTTP opts out", () => {
    assert.equal(cookieIsSecure("production", undefined), true);
    assert.equal(cookieIsSecure("development", undefined), false);
    assert.equal(cookieIsSecure("production", "false"), false);
    assert.equal(cookieIsSecure("development", "true"), true);
  });

  it("requires a 32+ character session secret", () => {
    assert.equal(sessionSecretError("short"), "会话密钥未配置");
    assert.equal(sessionSecretError("x".repeat(32)), null);
  });

  it("uses a generic unauthorized message", () => {
    assert.equal(LOGIN_REQUIRED_MESSAGE, "请先登录");
  });

  it("reads a session payload only inside the absolute window", () => {
    const now = 1_700_000_000_000;
    const payload = {
      userId: 4,
      username: "admin",
      displayName: "管理员",
      role: "admin" as const,
      loginAt: now - 1000,
    };
    assert.deepEqual(parseSession(payload, now), payload);
    assert.equal(parseSession({ ...payload, loginAt: now - SESSION_TTL_MS }, now), null);
    assert.equal(parseSession({ ...payload, role: "root" }, now), null);
    assert.equal(parseSession({ ...payload, userId: 0 }, now), null);
    assert.equal(parseSession({}, now), null);
  });

  it("trims usernames and rejects blank, overlong, or control characters", () => {
    assert.equal(normalizeUsername("  admin  "), "admin");
    assert.equal(normalizeUsername(""), null);
    assert.equal(normalizeUsername("a".repeat(65)), null);
    assert.equal(normalizeUsername("a\nb"), null);
    assert.equal(normalizeUsername(12), null);
  });
});

describe("users page", () => {
  const source = readFileSync(new URL("../app/users/page.tsx", import.meta.url), "utf8");

  it("never selects password_hash", () => {
    const columns = source.match(/const USER_LIST_COLUMNS = \[([\s\S]*?)\] as const;/);
    assert.ok(columns, "USER_LIST_COLUMNS missing");
    assert.doesNotMatch(columns[1], /password_hash/);
    assert.match(source, /delete \(safe as \{ password_hash\?: unknown \}\)\.password_hash/);
    assert.doesNotMatch(source, /SELECT\s+password_hash/i);
    assert.doesNotMatch(source, /SELECT\s+\*/);
  });
});
