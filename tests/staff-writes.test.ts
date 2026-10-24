import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { LAST_ADMIN_MESSAGE, removesLastActiveAdmin } from "../lib/staff-policy.ts";

describe("last active admin", () => {
  it("blocks demoting or disabling the only active admin", () => {
    assert.equal(LAST_ADMIN_MESSAGE, "不能停用或降级最后一个启用的管理员");
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 1,
        targetRole: "admin",
        targetStatus: "active",
        nextRole: "operator",
        nextStatus: "active",
      }),
      true,
    );
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 1,
        targetRole: "admin",
        targetStatus: "active",
        nextRole: "admin",
        nextStatus: "disabled",
      }),
      true,
    );
  });

  it("allows edits that leave an active admin, and edits of non-admins", () => {
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 1,
        targetRole: "admin",
        targetStatus: "active",
        nextRole: "admin",
        nextStatus: "active",
      }),
      false,
    );
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 2,
        targetRole: "admin",
        targetStatus: "active",
        nextRole: "operator",
        nextStatus: "disabled",
      }),
      false,
    );
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 1,
        targetRole: "operator",
        targetStatus: "active",
        nextRole: "operator",
        nextStatus: "disabled",
      }),
      false,
    );
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 1,
        targetRole: "admin",
        targetStatus: "disabled",
        nextRole: "operator",
        nextStatus: "disabled",
      }),
      false,
    );
  });
});

describe("staff write sources", () => {
  it("keeps password_hash out of user pages and out of SELECT or RETURNING", () => {
    const files = walk("app/users").concat(["lib/users.ts", "lib/staff-policy.ts"]);
    assert.ok(files.some((file) => file.endsWith("app/users/actions.ts")));
    for (const file of files) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      assert.doesNotMatch(source, /SELECT\s[^;]*password_hash/i, file);
      assert.doesNotMatch(source, /RETURNING\s[^;]*password_hash/i, file);
      if (file.endsWith(".tsx")) {
        const visible = source
          .replace(/\/\*\*[\s\S]*?\*\//g, "")
          .replace(/delete \(safe as \{ password_hash\?: unknown \}\)\.password_hash;/, "");
        assert.doesNotMatch(visible, /password_hash/, file);
      }
    }
  });

  it("lets any signed-in staff write prices, and only admins write users", () => {
    const prices = readFileSync(new URL("../app/prices/actions.ts", import.meta.url), "utf8");
    assert.match(prices, /export async function updatePriceYearAction/);
    assert.match(prices, /requireActiveUser\(/);
    assert.doesNotMatch(prices, /requireAdmin|role !== ["']admin["']/);

    const users = readFileSync(new URL("../app/users/actions.ts", import.meta.url), "utf8");
    assert.match(users, /requireAdmin\(/);
    assert.doesNotMatch(users, /requireActiveUser\(/);
  });
});

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(path);
  }
  return out;
}
