/**
 * Opt-in database checks for staff and price writes.
 * Skipped unless STAFF_DB_TEST=1 and the usual DB_* variables point at rice_ordering.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyPassword } from "../lib/password.ts";
import {
  ADMIN_CREATE_DENIED,
  LAST_ADMIN_MESSAGE,
  PRICING_EXISTS_MESSAGE,
} from "../lib/staff-policy.ts";

const enabled = process.env.STAFF_DB_TEST === "1";

describe("staff and price writes against postgres", { skip: !enabled }, () => {
  it("creates assignable roles, guards singleton admin/pricing, edits prices", async () => {
    const { PublicError } = await import("../lib/public-error.ts");
    const { query, getPool } = await import("../lib/db.ts");
    const { createStaffUser, updateStaffUser } = await import("../lib/users.ts");
    const { createPriceYear, updatePriceYear } = await import("../lib/prices.ts");

    const stamp = Date.now().toString(36);
    const sysUser = `tw_user_${stamp}`;
    const pricingA = `tw_price_${stamp}`;
    const pricingB = `tw_price2_${stamp}`;
    const year = 2091;
    const password = "correct horse battery";
    const reset = "replacement password";

    // Ensure a sole admin exists for last-admin checks (do not delete real admin).
    const admins = await query<{ id: string | number; username: string }>(
      `SELECT id, username FROM app_users WHERE role = 'admin' AND status = 'active'`,
    );
    assert.ok(admins[0], "need one active admin in DB for this test");
    const adminId = Number(admins[0].id);

    try {
      await query(`DELETE FROM rice_year_prices WHERE year = $1`, [year]);
      await query(`DELETE FROM app_users WHERE username LIKE 'tw_%'`);

      await assert.rejects(
        () =>
          createStaffUser({
            username: `tw_admin_${stamp}`,
            displayName: "假管理员",
            role: "admin",
            status: "active",
            password,
          }),
        (error: unknown) =>
          error instanceof PublicError && error.message === ADMIN_CREATE_DENIED,
      );

      const created = await createStaffUser({
        username: sysUser,
        displayName: "系统用户甲",
        role: "user",
        status: "active",
        password,
      });
      assert.deepEqual(Object.keys(created).sort(), ["id", "username"]);
      assert.equal("password_hash" in created, false);

      const pricing = await createStaffUser({
        username: pricingA,
        displayName: "定价员",
        role: "pricing",
        status: "active",
        password,
      });

      await assert.rejects(
        () =>
          createStaffUser({
            username: pricingB,
            displayName: "定价员乙",
            role: "pricing",
            status: "active",
            password,
          }),
        (error: unknown) =>
          error instanceof PublicError && error.message === PRICING_EXISTS_MESSAGE,
      );

      await assert.rejects(
        () =>
          updateStaffUser({
            id: adminId,
            username: String(admins[0].username),
            displayName: "管理员",
            role: "user",
            status: "active",
            password: "",
          }),
        (error: unknown) =>
          error instanceof PublicError && error.message === LAST_ADMIN_MESSAGE,
      );

      await updateStaffUser({
        id: created.id,
        username: sysUser,
        displayName: "系统用户甲改",
        role: "user",
        status: "active",
        password: reset,
      });
      const after = await query<{ display_name: string; password_hash: string }>(
        `SELECT display_name, password_hash FROM app_users WHERE id = $1`,
        [created.id],
      );
      assert.equal(after[0]?.display_name, "系统用户甲改");
      assert.equal(await verifyPassword(reset, after[0]?.password_hash ?? ""), true);

      const priceCreated = await createPriceYear({
        year,
        riceCostPerJin: 3.5,
        shippingFeePerJin: 1.2,
        vacuumFeePerJin: 0.5,
        retailPlainPerJin: 8.5,
        retailVacuumPerJin: 9,
        vipPlainPerJin: 7.5,
        vipVacuumPerJin: 8,
        jinPerPack: 10,
      });
      assert.equal(priceCreated.batch, "00");
      const priceRevised = await updatePriceYear({
        year,
        sourceBatch: "00",
        riceCostPerJin: 4,
        shippingFeePerJin: 1.2,
        vacuumFeePerJin: 0.5,
        retailPlainPerJin: 8.5,
        retailVacuumPerJin: 9,
        vipPlainPerJin: 7.5,
        vipVacuumPerJin: 8,
        jinPerPack: 10,
        costNote: "调价",
      });
      assert.equal(priceRevised.batch, "01");
      const original = await query<{ rice_cost_per_jin: string }>(
        `SELECT rice_cost_per_jin::text FROM rice_year_prices WHERE year = $1 AND batch = $2`,
        [year, "00"],
      );
      assert.equal(Number(original[0]?.rice_cost_per_jin), 3.5);
      const price = await query<{ rice_cost_per_jin: string }>(
        `SELECT rice_cost_per_jin::text FROM rice_year_prices WHERE year = $1 AND batch = $2`,
        [year, "01"],
      );
      assert.equal(Number(price[0]?.rice_cost_per_jin), 4);
      assert.ok(pricing.id);
    } finally {
      await query(`DELETE FROM rice_year_prices WHERE year = $1`, [year]);
      await query(`DELETE FROM app_users WHERE username LIKE 'tw_%'`);
      await getPool().end();
    }
  });
});
