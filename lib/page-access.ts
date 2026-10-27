import { canAccessArea, type NavArea } from "@/lib/access";
import { resolveAuth, type AuthUser } from "@/lib/current-user";

export type PageAccess =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

export async function requirePageArea(area: NavArea): Promise<PageAccess> {
  const auth = await resolveAuth();
  if (auth.kind !== "active") {
    return { ok: false, message: "请先登录。" };
  }
  if (!canAccessArea(auth.user.role, area)) {
    return { ok: false, message: "无权查看此页面。" };
  }
  return { ok: true, user: auth.user };
}
