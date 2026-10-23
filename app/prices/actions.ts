"use server";

import { revalidatePath } from "next/cache";
import { createPriceYear } from "@/lib/prices";

export type ActionState = {
  ok: boolean;
  message: string;
};

function money(formData: FormData, key: string): number {
  return Number(String(formData.get(key) || "").trim());
}

export async function createPriceYearAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const result = await createPriceYear({
      year: Number(String(formData.get("year") || "").trim()),
      riceCostPerJin: money(formData, "riceCostPerJin"),
      shippingFeePerJin: money(formData, "shippingFeePerJin"),
      vacuumFeePerJin: money(formData, "vacuumFeePerJin"),
      retailPlainPerJin: money(formData, "retailPlainPerJin"),
      retailVacuumPerJin: money(formData, "retailVacuumPerJin"),
      vipPlainPerJin: money(formData, "vipPlainPerJin"),
      vipVacuumPerJin: money(formData, "vipVacuumPerJin"),
      jinPerPack: Number(String(formData.get("jinPerPack") || "").trim()),
    });
    revalidatePath("/prices");
    revalidatePath("/orders");
    return { ok: true, message: `已创建 ${result.year} 年价目` };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "创建失败",
    };
  }
}
