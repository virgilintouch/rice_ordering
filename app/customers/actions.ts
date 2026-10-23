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

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function createCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
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
    return {
      ok: false,
      message: error instanceof Error ? error.message : "创建失败",
    };
  }
}

export async function setCustomerStatusAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("customerId"));
  const status = String(formData.get("status")) as "active" | "disabled";
  if (!id || (status !== "active" && status !== "disabled")) {
    throw new Error("参数无效");
  }
  await setCustomerStatus(id, status);
  revalidatePath("/customers");
}

export async function updateCustomerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const customerId = Number(formData.get("customerId"));
    const addressId = Number(formData.get("addressId"));
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
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "保存失败",
    };
  }
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("customerId"));
  if (!id) throw new Error("参数无效");
  await softDeleteCustomer(id);
  revalidatePath("/customers");
}

export async function importCustomersAction(formData: FormData): Promise<void> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/customers/import?error=" + encodeURIComponent("请选择文件"));
  }
  if (file.size > 2 * 1024 * 1024) {
    redirect("/customers/import?error=" + encodeURIComponent("文件不能超过 2MB"));
  }

  try {
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
          .map((f) => `${f.line}:${f.reason}`)
          .join("|"),
      );
    }
    redirect(`/customers/import?${q.toString()}`);
  } catch (error) {
    // next/navigation redirect() throws; must rethrow
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "导入失败";
    redirect("/customers/import?error=" + encodeURIComponent(message));
  }
}
