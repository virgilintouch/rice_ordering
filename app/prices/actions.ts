"use server";

import { revalidatePath } from "next/cache";
import { parseMoney, parsePositiveInt, requiredYear } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { logServerError, publicErrorMessage } from "@/lib/public-error";
import { createPriceYear } from "@/lib/prices";

export type ActionState = {
  ok: boolean;
  message: string;
};

function money(formData: FormData, key: string, label: string): number {
  return parseMoney(String(formData.get(key) ?? ""), label);
}

export async function createPriceYearAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const result = await createPriceYear({
      year: requiredYear(String(formData.get("year") ?? "")),
      riceCostPerJin: money(formData, "riceCostPerJin", "大米成本"),
      shippingFeePerJin: money(formData, "shippingFeePerJin", "运费"),
      vacuumFeePerJin: money(formData, "vacuumFeePerJin", "真空费"),
      retailPlainPerJin: money(formData, "retailPlainPerJin", "零售普通价"),
      retailVacuumPerJin: money(formData, "retailVacuumPerJin", "零售真空价"),
      vipPlainPerJin: money(formData, "vipPlainPerJin", "VIP 普通价"),
      vipVacuumPerJin: money(formData, "vipVacuumPerJin", "VIP 真空价"),
      jinPerPack: parsePositiveInt(
        String(formData.get("jinPerPack") ?? ""),
        "每包斤数",
        LIMITS.jinPerPackMax,
      ),
    });
    revalidatePath("/prices");
    revalidatePath("/orders");
    return { ok: true, message: `已创建 ${result.year} 年价目` };
  } catch (error) {
    logServerError("createPriceYear", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "创建失败"),
    };
  }
}
