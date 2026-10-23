"use server";

import { revalidatePath } from "next/cache";
import { createOrder, advanceOrderStatus, type PriceTier } from "@/lib/orders";

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
      customerId: Number(formData.get("customerId")),
      addressId: Number(formData.get("addressId")),
      priceYear: Number(formData.get("priceYear")),
      priceTier: String(formData.get("priceTier")) as PriceTier,
      packCount: Number(formData.get("packCount")),
      note: String(formData.get("note") || ""),
    });
    revalidatePath("/orders");
    return {
      ok: true,
      message: `已创建订单 ${result.orderNo}，金额 ${result.amount}`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "下单失败",
    };
  }
}

export async function advanceOrderAction(formData: FormData): Promise<void> {
  const orderId = Number(formData.get("orderId"));
  if (!orderId) throw new Error("参数无效");
  await advanceOrderStatus(orderId);
  revalidatePath("/orders");
}
