"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/current-user";
import { requiredId } from "@/lib/input";
import { isNextRedirect, logServerError, publicErrorMessage } from "@/lib/public-error";
import { createStaffUser, deleteStaffUser, updateStaffUser } from "@/lib/users";

export type ActionState = {
  ok: boolean;
  message: string;
};

function staffFields(formData: FormData) {
  const password = formData.get("password");
  return {
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: String(formData.get("status") ?? ""),
    password: typeof password === "string" ? password : "",
  };
}

export async function createStaffUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    const result = await createStaffUser(staffFields(formData));
    revalidatePath("/users");
    return { ok: true, message: `已创建账号 ${result.username}` };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("createStaffUser", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "创建失败"),
    };
  }
}

export async function updateStaffUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    await updateStaffUser({
      id: requiredId(formData.get("userId"), "用户"),
      ...staffFields(formData),
    });
    revalidatePath("/users");
    revalidatePath("/", "layout");
    redirect("/users");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("updateStaffUser", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "保存失败"),
    };
  }
}

export async function deleteStaffUserAction(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
    await deleteStaffUser(requiredId(formData.get("userId"), "用户"));
    revalidatePath("/users");
    revalidatePath("/", "layout");
  } catch (error) {
    logServerError("deleteStaffUser", error);
    throw error;
  }
}
