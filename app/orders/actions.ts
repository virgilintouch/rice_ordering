"use server";

import { revalidatePath } from "next/cache";
import { parsePositiveInt, requiredId, requiredYear } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { logServerError, PublicError, publicErrorMessage } from "@/lib/public-error";
import { createOrder, advanceOrderStatus } from "@/lib/orders";

export type ActionState = {
  ok: boolean;
  message: string;
};

export async function createOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const result = await createOrder({
      customerId: requiredId(formData.get("customerId"), "客户"),
      addressId: requiredId(formData.get("addressId"), "地址"),
      priceYear: requiredYear(String(formData.get("priceYear") ?? "")),
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
    logServerError("createOrder", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "下单失败"),
    };
  }
}

export async function advanceOrderAction(formData: FormData): Promise<void> {
  try {
    const orderId = requiredId(formData.get("orderId"), "订单");
    await advanceOrderStatus(orderId);
    revalidatePath("/orders");
  } catch (error) {
    logServerError("advanceOrder", error);
    throw new PublicError(publicErrorMessage(error, "更新订单失败"));
  }
}
