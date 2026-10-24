"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/authenticate";
import { isNextRedirect, logServerError, publicErrorMessage } from "@/lib/public-error";
import { getSession } from "@/lib/session";
import { LOGIN_FAILED_MESSAGE, safeNextPath } from "@/lib/session-policy";

export type LoginState = {
  ok: false;
  message: string;
};

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    const user = await authenticate(text(formData.get("username")), text(formData.get("password")));
    if (!user) return { ok: false, message: LOGIN_FAILED_MESSAGE };
    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.displayName = user.displayName;
    session.role = user.role;
    session.loginAt = Date.now();
    await session.save();
    redirect(safeNextPath(text(formData.get("next"))) ?? "/");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("login", error);
    return { ok: false, message: publicErrorMessage(error, "登录失败") };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const session = await getSession();
    session.destroy();
  } catch (error) {
    logServerError("logout", error);
  }
  redirect("/login");
}
