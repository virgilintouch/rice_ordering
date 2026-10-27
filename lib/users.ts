import { withTransaction } from "@/lib/db";
import { requiredId, requiredText } from "@/lib/input";
import { PASSWORD_MAX_LENGTH, hashPassword } from "@/lib/password";
import { PublicError } from "@/lib/public-error";
import {
  ADMIN_ASSIGNABLE_ROLES,
  ADMIN_CREATE_DENIED,
  LAST_ADMIN_MESSAGE,
  LAST_PRICING_MESSAGE,
  PRICING_EXISTS_MESSAGE,
  isStaffRole,
  removesLastActiveAdmin,
  removesLastActivePricing,
  wouldAddSecondActivePricing,
  type StaffRole,
  type StaffStatus,
} from "@/lib/staff-policy";
import { normalizeUsername } from "@/lib/session-policy";

export type StaffWriteInput = {
  username: string;
  displayName: string;
  role: string;
  status: string;
  /** Empty on update means keep the current hash. Required on create. */
  password: string;
};

function requiredUsername(raw: string): string {
  const username = normalizeUsername(raw);
  if (!username) throw new PublicError("用户名需为 1–64 个字符，且不能包含控制字符");
  return username;
}

function parseRole(raw: string): StaffRole {
  if (!isStaffRole(raw)) throw new PublicError("角色无效");
  return raw;
}

function parseStatus(raw: string): StaffStatus {
  if (raw !== "active" && raw !== "disabled") throw new PublicError("状态无效");
  return raw;
}

function parseAssignableRole(raw: string): StaffRole {
  const role = parseRole(raw);
  if (!ADMIN_ASSIGNABLE_ROLES.includes(role)) {
    throw new PublicError(ADMIN_CREATE_DENIED);
  }
  return role;
}

async function storedPasswordHash(password: string): Promise<string> {
  if (!password) throw new PublicError("密码为必填");
  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new PublicError(`密码不能超过 ${PASSWORD_MAX_LENGTH} 个字符`);
  }
  return hashPassword(password);
}

function dbId(value: string | number): number | null {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

function staffResult(row: { id: string | number; username: string } | undefined): {
  id: number;
  username: string;
} {
  const id = row ? dbId(row.id) : null;
  if (!row || id == null) throw new PublicError("保存失败");
  return { id, username: row.username };
}

export async function createStaffUser(
  input: StaffWriteInput,
): Promise<{ id: number; username: string }> {
  const username = requiredUsername(input.username);
  const displayName = requiredText(input.displayName, "显示名", 64);
  const role = parseAssignableRole(input.role);
  const status = parseStatus(input.status);
  const passwordHash = await storedPasswordHash(input.password);

  return withTransaction(async (q) => {
    const taken = await q<{ id: string | number }>(
      `SELECT id FROM app_users WHERE username = $1`,
      [username],
    );
    if (taken[0]) throw new PublicError("用户名已存在");

    if (role === "pricing" && status === "active") {
      const pricing = await q<{ id: string | number }>(
        `SELECT id FROM app_users WHERE role = 'pricing' AND status = 'active' FOR UPDATE`,
      );
      if (pricing[0]) throw new PublicError(PRICING_EXISTS_MESSAGE);
    }

    const rows = await q<{ id: string | number; username: string }>(
      `INSERT INTO app_users (username, password_hash, display_name, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username`,
      [username, passwordHash, displayName, role, status],
    );
    return staffResult(rows[0]);
  });
}

export async function updateStaffUser(
  input: StaffWriteInput & { id: number },
): Promise<{ id: number; username: string }> {
  const id = requiredId(input.id, "用户");
  const username = requiredUsername(input.username);
  const displayName = requiredText(input.displayName, "显示名", 64);
  const status = parseStatus(input.status);
  const passwordHash = input.password ? await storedPasswordHash(input.password) : null;

  return withTransaction(async (q) => {
    const activeAdmins = await q<{ id: string | number }>(
      `SELECT id
       FROM app_users
       WHERE role = 'admin' AND status = 'active'
       ORDER BY id
       FOR UPDATE`,
    );
    const activePricing = await q<{ id: string | number }>(
      `SELECT id
       FROM app_users
       WHERE role = 'pricing' AND status = 'active'
       ORDER BY id
       FOR UPDATE`,
    );
    const targetRows = await q<{ id: string | number; role: string; status: string }>(
      `SELECT id, role, status
       FROM app_users
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    const target = targetRows[0];
    if (!target) throw new PublicError("用户不存在");
    if (!isStaffRole(target.role) || (target.status !== "active" && target.status !== "disabled")) {
      throw new PublicError("账号数据无效");
    }

    // Editing the sole admin: keep role=admin (cannot create another admin via form).
    // Editing anyone else: only assignable roles.
    let role: StaffRole;
    if (target.role === "admin") {
      role = "admin";
      if (parseRole(input.role) !== "admin") {
        throw new PublicError(LAST_ADMIN_MESSAGE);
      }
    } else {
      role = parseAssignableRole(input.role);
    }

    if (
      removesLastActiveAdmin({
        activeAdminCount: activeAdmins.length,
        targetRole: target.role,
        targetStatus: target.status as StaffStatus,
        nextRole: role,
        nextStatus: status,
      })
    ) {
      throw new PublicError(LAST_ADMIN_MESSAGE);
    }
    if (
      removesLastActivePricing({
        activePricingCount: activePricing.length,
        targetRole: target.role,
        targetStatus: target.status as StaffStatus,
        nextRole: role,
        nextStatus: status,
      })
    ) {
      throw new PublicError(LAST_PRICING_MESSAGE);
    }
    if (
      wouldAddSecondActivePricing({
        activePricingCount: activePricing.length,
        nextRole: role,
        nextStatus: status,
        targetAlreadyActivePricing:
          target.role === "pricing" && target.status === "active",
      })
    ) {
      throw new PublicError(PRICING_EXISTS_MESSAGE);
    }

    const taken = await q<{ id: string | number }>(
      `SELECT id FROM app_users WHERE username = $1 AND id <> $2`,
      [username, id],
    );
    if (taken[0]) throw new PublicError("用户名已存在");

    const rows = passwordHash
      ? await q<{ id: string | number; username: string }>(
          `UPDATE app_users
           SET username = $2,
               display_name = $3,
               role = $4,
               status = $5,
               password_hash = $6,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, username`,
          [id, username, displayName, role, status, passwordHash],
        )
      : await q<{ id: string | number; username: string }>(
          `UPDATE app_users
           SET username = $2,
               display_name = $3,
               role = $4,
               status = $5,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, username`,
          [id, username, displayName, role, status],
        );
    return staffResult(rows[0]);
  });
}

/** Hard-delete a non-admin account. Admin rows are never removable. */
export async function deleteStaffUser(idRaw: number): Promise<{ username: string }> {
  const id = requiredId(idRaw, "用户");

  return withTransaction(async (q) => {
    const targetRows = await q<{ id: string | number; username: string; role: string }>(
      `SELECT id, username, role
       FROM app_users
       WHERE id = $1
       FOR UPDATE`,
      [id],
    );
    const target = targetRows[0];
    if (!target) throw new PublicError("用户不存在");
    if (target.role === "admin") {
      throw new PublicError("不能删除管理员账号");
    }
    if (!isStaffRole(target.role)) throw new PublicError("账号数据无效");

    const deleted = await q<{ username: string }>(
      `DELETE FROM app_users WHERE id = $1 RETURNING username`,
      [id],
    );
    if (!deleted[0]) throw new PublicError("删除失败");
    return { username: deleted[0].username };
  });
}
