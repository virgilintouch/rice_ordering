"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCustomerWithAddress,
  importCustomerRows,
  setCustomerStatus,
  softDeleteCustomer,
  updateCustomerAndAddress,
} from "@/lib/customers";
import { parseCustomerImportFile } from "@/lib/import-parse";
import { requireActiveUser } from "@/lib/current-user";
import { clipDisplay, requiredId } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import {
  isNextRedirect,
  logServerError,
  PublicError,
  publicErrorMessage,
} from "@/lib/public-error";

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireActiveUser();
    const result = await createCustomerWithAddress({
      name: String(formData.get("name") || ""),
      source: String(formData.get("source") || ""),
      note: String(formData.get("note") || ""),
      recipientName: String(formData.get("recipientName") || ""),
      recipientPhone: String(formData.get("recipientPhone") || ""),
      address: String(formData.get("address") || ""),
      label: String(formData.get("label") || ""),
    });
    revalidatePath("/customers");
    return { ok: true, message: `已创建客户 ${result.code}` };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("createCustomer", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "创建失败"),
    };
  }
}

export async function setCustomerStatusAction(formData: FormData): Promise<void> {
  try {
    await requireActiveUser();
    const id = requiredId(formData.get("customerId"), "客户");
    const status = String(formData.get("status") ?? "");
    if (status !== "active" && status !== "disabled") {
      throw new PublicError("状态无效");
    }
    await setCustomerStatus(id, status);
    revalidatePath("/customers");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("setCustomerStatus", error);
    throw new PublicError(publicErrorMessage(error, "更新状态失败"));
  }
}

export async function updateCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireActiveUser();
    const customerId = requiredId(formData.get("customerId"), "客户");
    const addressId = requiredId(formData.get("addressId"), "地址");
    await updateCustomerAndAddress({
      customerId,
      addressId,
      name: String(formData.get("name") || ""),
      source: String(formData.get("source") || ""),
      note: String(formData.get("note") || ""),
      status: String(formData.get("status") || "active") as "active" | "disabled",
      recipientName: String(formData.get("recipientName") || ""),
      recipientPhone: String(formData.get("recipientPhone") || ""),
      address: String(formData.get("address") || ""),
      label: String(formData.get("label") || ""),
    });
    revalidatePath("/customers");
    redirect("/customers");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("updateCustomer", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "保存失败"),
    };
  }
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  try {
    await requireActiveUser();
    const id = requiredId(formData.get("customerId"), "客户");
    await softDeleteCustomer(id);
    revalidatePath("/customers");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("deleteCustomer", error);
    throw new PublicError(publicErrorMessage(error, "删除失败"));
  }
}

export async function importCustomersAction(formData: FormData): Promise<void> {
  try {
    await requireActiveUser();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      redirect("/customers/import?error=" + encodeURIComponent("请选择文件"));
    }
    if (file.size > LIMITS.importMaxBytes) {
      redirect("/customers/import?error=" + encodeURIComponent("文件不能超过 2MB"));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = parseCustomerImportFile(buffer, file.name);
    const result = await importCustomerRows(rows);
    revalidatePath("/customers");
    const q = new URLSearchParams({
      created: String(result.createdCustomers),
      addresses: String(result.addedAddresses),
      skipped: String(result.skipped),
      failed: String(result.failed.length),
    });
    if (result.failed.length) {
      q.set(
        "failedDetail",
        result.failed
          .slice(0, 20)
          .map((f) => `${f.line}:${f.reason.replace(/[\r\n|]/g, " ").slice(0, 120)}`)
          .join("|"),
      );
    }
    redirect(`/customers/import?${q.toString()}`);
  } catch (error) {
    // next/navigation redirect() throws; must rethrow
    if (isNextRedirect(error)) throw error;
    logServerError("importCustomers", error);
    const message = clipDisplay(publicErrorMessage(error, "导入失败"), 200);
    redirect("/customers/import?error=" + encodeURIComponent(message));
  }
}
