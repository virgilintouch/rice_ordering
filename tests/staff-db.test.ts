/**
 * Opt-in database checks for staff and price writes.
 * Skipped unless STAFF_DB_TEST=1 and the usual DB_* variables point at rice_ordering.
 * Not part of the default assumption that `npm test` has no database.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyPassword } from "../lib/password.ts";
import { LAST_ADMIN_MESSAGE } from "../lib/staff-policy.ts";

const enabled = process.env.STAFF_DB_TEST === "1";

describe("staff and price writes against postgres", { skip: !enabled }, () => {
  it("creates users, guards the last admin, and edits a price year", async () => {
    const { PublicError } = await import("../lib/public-error.ts");
    const { query, getPool } = await import("../lib/db.ts");
    const { createStaffUser, updateStaffUser } = await import("../lib/users.ts");
    const { createPriceYear, updatePriceYear } = await import("../lib/prices.ts");

    const stamp = Date.now().toString(36);
    const adminA = `tw_admin_${stamp}`;
    const adminB = `tw_admin2_${stamp}`;
    const operator = `tw_op_${stamp}`;
    const year = 2091;
    const password = "correct horse battery";
    const reset = "replacement password";

    try {
      await query(`DELETE FROM rice_year_prices WHERE year = $1`, [year]);
      await query(`DELETE FROM app_users WHERE username LIKE 'tw_%'`);

      const created = await createStaffUser({
        username: adminA,
        displayName: "管理员甲",
        role: "admin",
        status: "active",
        password,
      });
      assert.deepEqual(Object.keys(created).sort(), ["id", "username"]);
      assert.equal("password_hash" in created, false);

      await createStaffUser({
        username: operator,
        displayName: "操作员",
        role: "operator",
        status: "active",
        password,
      });

      await assert.rejects(
        () =>
          updateStaffUser({
            id: created.id,
            username: adminA,
            displayName: "管理员甲",
            role: "operator",
            status: "active",
            password: "",
          }),
        (error: unknown) => error instanceof PublicError && error.message === LAST_ADMIN_MESSAGE,
      );
      await assert.rejects(
        () =>
          updateStaffUser({
            id: created.id,
            username: adminA,
            displayName: "管理员甲",
            role: "admin",
            status: "disabled",
            password: "",
          }),
        (error: unknown) => error instanceof PublicError && error.message === LAST_ADMIN_MESSAGE,
      );

      const stillAdmin = await query<{ role: string; status: string; password_hash: string }>(
        `SELECT role, status, password_hash FROM app_users WHERE id = $1`,
        [created.id],
      );
      assert.equal(stillAdmin[0]?.role, "admin");
      assert.equal(stillAdmin[0]?.status, "active");
      assert.match(stillAdmin[0]?.password_hash ?? "", /^\$2[ab]\$10\$/);
      assert.equal(await verifyPassword(password, stillAdmin[0]?.password_hash ?? ""), true);

      await updateStaffUser({
        id: created.id,
        username: adminA,
        displayName: "管理员甲改",
        role: "admin",
        status: "active",
        password: "",
      });
      const kept = await query<{ display_name: string; password_hash: string }>(
        `SELECT display_name, password_hash FROM app_users WHERE id = $1`,
        [created.id],
      );
      assert.equal(kept[0]?.display_name, "管理员甲改");
      assert.equal(await verifyPassword(password, kept[0]?.password_hash ?? ""), true);

      const second = await createStaffUser({
        username: adminB,
        displayName: "管理员乙",
        role: "admin",
        status: "active",
        password,
      });
      const disabled = await updateStaffUser({
        id: created.id,
        username: adminA,
        displayName: "管理员甲改",
        role: "admin",
        status: "disabled",
        password: reset,
      });
      assert.equal("password_hash" in disabled, false);
      const after = await query<{ status: string; password_hash: string }>(
        `SELECT status, password_hash FROM app_users WHERE id = $1`,
        [created.id],
      );
      assert.equal(after[0]?.status, "disabled");
      assert.equal(await verifyPassword(reset, after[0]?.password_hash ?? ""), true);
      assert.equal(await verifyPassword(password, after[0]?.password_hash ?? ""), false);
      assert.equal(second.username, adminB);

      await assert.rejects(
        () =>
          createStaffUser({
            username: adminB,
            displayName: "重复",
            role: "operator",
            status: "active",
            password,
          }),
        (error: unknown) => error instanceof PublicError && error.message === "用户名已存在",
      );

      await createPriceYear({
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
      await updatePriceYear({
        year,
        riceCostPerJin: 4,
        shippingFeePerJin: 1.2,
        vacuumFeePerJin: 0.5,
        retailPlainPerJin: 8.5,
        retailVacuumPerJin: 9,
        vipPlainPerJin: 7.5,
        vipVacuumPerJin: 8,
        jinPerPack: 10,
      });
      const price = await query<{ rice_cost_per_jin: string; year: number }>(
        `SELECT year, rice_cost_per_jin FROM rice_year_prices WHERE year = $1`,
        [year],
      );
      assert.equal(price[0]?.year, year);
      assert.equal(price[0]?.rice_cost_per_jin, "4.00");
      await assert.rejects(
        () =>
          updatePriceYear({
            year: 2092,
            riceCostPerJin: 4,
            shippingFeePerJin: 1.2,
            vacuumFeePerJin: 0.5,
            retailPlainPerJin: 8.5,
            retailVacuumPerJin: 9,
            vipPlainPerJin: 7.5,
            vipVacuumPerJin: 8,
            jinPerPack: 10,
          }),
        (error: unknown) => error instanceof PublicError && /不存在/.test(error.message),
      );
    } finally {
      await query(`DELETE FROM rice_year_prices WHERE year = $1`, [year]);
      await query(`DELETE FROM app_users WHERE username LIKE 'tw_%'`);
      await getPool().end();
    }
  });
});
