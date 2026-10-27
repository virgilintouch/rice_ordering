import type { SessionRole } from "@/lib/session-policy";

/** Nav / home cards visibility by role. */
export type NavArea = "orders" | "customers" | "prices" | "users" | "reports";

const ACCESS: Record<SessionRole, readonly NavArea[]> = {
  admin: ["users"],
  pricing: ["prices"],
  user: ["orders", "customers", "prices", "reports"],
};

export function areasForRole(role: SessionRole): readonly NavArea[] {
  return ACCESS[role] ?? [];
}

export function canAccessArea(role: SessionRole, area: NavArea): boolean {
  return areasForRole(role).includes(area);
}

/** System users may read selling prices but not edit; pricing edits full价目. */
export function canWritePrices(role: SessionRole): boolean {
  return role === "pricing";
}

export function canSeePriceCost(role: SessionRole): boolean {
  return role === "pricing";
}

export function canWriteBusiness(role: SessionRole): boolean {
  return role === "user";
}
