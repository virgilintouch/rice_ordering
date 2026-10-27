import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "node:test";
import {
  LAST_ADMIN_MESSAGE,
  LAST_PRICING_MESSAGE,
  removesLastActiveAdmin,
  removesLastActivePricing,
  wouldAddSecondActivePricing,
} from "../lib/staff-policy.ts";

describe("last active admin", () => {
  it("blocks demoting or disabling the only active admin", () => {
    assert.equal(LAST_ADMIN_MESSAGE, "不能停用或降级唯一的启用管理员");
    assert.equal(
      removesLastActiveAdmin({
        activeAdminCount: 1,
        targetRole: "admin",
        targetStatus: "active",
        nextRole: "user",
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
        activeAdminCount: 1,
        targetRole: "user",
        targetStatus: "active",
        nextRole: "pricing",
        nextStatus: "active",
      }),
      false,
    );
  });
});

describe("pricing singleton", () => {
  it("blocks removing the only active pricing user", () => {
    assert.equal(LAST_PRICING_MESSAGE, "不能停用或降级唯一的启用定价员");
    assert.equal(
      removesLastActivePricing({
        activePricingCount: 1,
        targetRole: "pricing",
        targetStatus: "active",
        nextRole: "user",
        nextStatus: "active",
      }),
      true,
    );
  });

  it("blocks adding a second active pricing user", () => {
    assert.equal(
      wouldAddSecondActivePricing({
        activePricingCount: 1,
        nextRole: "pricing",
        nextStatus: "active",
      }),
      true,
    );
    assert.equal(
      wouldAddSecondActivePricing({
        activePricingCount: 1,
        nextRole: "pricing",
        nextStatus: "active",
        targetAlreadyActivePricing: true,
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
      if (file.includes(" 2.")) continue;
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

  it("lets only pricing write prices, business users write customers/orders, admins write users", () => {
    const prices = readFileSync(new URL("../app/prices/actions.ts", import.meta.url), "utf8");
    assert.match(prices, /requirePricing\(/);
    assert.doesNotMatch(prices, /requireActiveUser\(|requireBusinessUser\(/);

    const customers = readFileSync(
      new URL("../app/customers/actions.ts", import.meta.url),
      "utf8",
    );
    assert.match(customers, /requireBusinessUser\(/);

    const orders = readFileSync(new URL("../app/orders/actions.ts", import.meta.url), "utf8");
    assert.match(orders, /requireBusinessUser\(/);

    const users = readFileSync(new URL("../app/users/actions.ts", import.meta.url), "utf8");
    assert.match(users, /requireAdmin\(/);
    assert.doesNotMatch(users, /requireBusinessUser\(/);
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
