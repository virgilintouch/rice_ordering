export const LAST_ADMIN_MESSAGE = "不能停用或降级唯一的启用管理员";
export const LAST_PRICING_MESSAGE = "不能停用或降级唯一的启用定价员";
export const ADMIN_CREATE_DENIED = "不能创建管理员账号";
export const PRICING_EXISTS_MESSAGE = "已存在启用的定价员，不能再建";

export type StaffRole = "admin" | "pricing" | "user";
export type StaffStatus = "active" | "disabled";

/** Roles an admin may assign when creating or editing other accounts. */
export const ADMIN_ASSIGNABLE_ROLES: StaffRole[] = ["pricing", "user"];

/** True when this edit would leave zero active admins. */
export function removesLastActiveAdmin(input: {
  activeAdminCount: number;
  targetRole: StaffRole;
  targetStatus: StaffStatus;
  nextRole: StaffRole;
  nextStatus: StaffStatus;
}): boolean {
  const targetIsActiveAdmin = input.targetRole === "admin" && input.targetStatus === "active";
  if (!targetIsActiveAdmin) return false;
  const nextIsActiveAdmin = input.nextRole === "admin" && input.nextStatus === "active";
  if (nextIsActiveAdmin) return false;
  return !Number.isInteger(input.activeAdminCount) || input.activeAdminCount <= 1;
}

/** True when this edit would leave zero active pricing users. */
export function removesLastActivePricing(input: {
  activePricingCount: number;
  targetRole: StaffRole;
  targetStatus: StaffStatus;
  nextRole: StaffRole;
  nextStatus: StaffStatus;
}): boolean {
  const targetIsActivePricing =
    input.targetRole === "pricing" && input.targetStatus === "active";
  if (!targetIsActivePricing) return false;
  const nextIsActivePricing =
    input.nextRole === "pricing" && input.nextStatus === "active";
  if (nextIsActivePricing) return false;
  return !Number.isInteger(input.activePricingCount) || input.activePricingCount <= 1;
}

/** Creating a second active pricing row (or promoting someone to it). */
export function wouldAddSecondActivePricing(input: {
  activePricingCount: number;
  nextRole: StaffRole;
  nextStatus: StaffStatus;
  /** When editing, true if the target is already the active pricing user. */
  targetAlreadyActivePricing?: boolean;
}): boolean {
  if (input.nextRole !== "pricing" || input.nextStatus !== "active") return false;
  if (input.targetAlreadyActivePricing) return false;
  return input.activePricingCount >= 1;
}

export function isStaffRole(raw: string): raw is StaffRole {
  return raw === "admin" || raw === "pricing" || raw === "user";
}
