export const LAST_ADMIN_MESSAGE = "不能停用或降级最后一个启用的管理员";

export type StaffRole = "admin" | "operator";
export type StaffStatus = "active" | "disabled";

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
