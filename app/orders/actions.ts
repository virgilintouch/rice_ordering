"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessUser } from "@/lib/current-user";
import { parsePositiveInt, requiredId, requiredYear } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import {
  isNextRedirect,
  logServerError,
  PublicError,
  publicErrorMessage,
} from "@/lib/public-error";
import { createOrder, advanceOrderStatus } from "@/lib/orders";
import { listBatchesForYear } from "@/lib/prices";
import { parseYear } from "@/lib/input";

export type ActionState = {
  ok: boolean;
  message: string;
};

/**
 * Order-entry batch dropdown: load existing batches for a year from DB.
 * Returns [] when the year is invalid or has no price rows. Never invents a batch.
 */
export async function listPriceBatchesForYearAction(
  yearRaw: string,
): Promise<string[]> {
  try {
    await requireBusinessUser();
    const year = parseYear(yearRaw);
    if (year == null) return [];
    return await listBatchesForYear(year);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("listPriceBatchesForYear", error);
    return [];
  }
}

export async function createOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireBusinessUser();
    const result = await createOrder({
      customerId: requiredId(formData.get("customerId"), "客户"),
      addressId: requiredId(formData.get("addressId"), "地址"),
      priceYear: requiredYear(String(formData.get("priceYear") ?? "")),
      // Batch is manual only — never invent a default here.
      priceBatch: String(formData.get("priceBatch") ?? ""),
      priceTier: String(formData.get("priceTier") ?? ""),
      packCount: parsePositiveInt(
        String(formData.get("packCount") ?? ""),
        "包数",
        LIMITS.packCountMax,
      ),
      note: String(formData.get("note") ?? ""),
    });
    revalidatePath("/orders");
    return {
      ok: true,
      message: `已创建订单 ${result.orderNo}，金额 ${result.amount}`,
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("createOrder", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "下单失败"),
    };
  }
}

export async function advanceOrderAction(formData: FormData): Promise<void> {
  try {
    await requireBusinessUser();
    const orderId = requiredId(formData.get("orderId"), "订单");
    await advanceOrderStatus(orderId);
    revalidatePath("/orders");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("advanceOrder", error);
    throw new PublicError(publicErrorMessage(error, "更新订单失败"));
  }
}
