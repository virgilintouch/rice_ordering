"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePricing } from "@/lib/current-user";
import {
  optionalText,
  parseMoney,
  parsePositiveInt,
  parseYear,
  requiredBatch,
  requiredYear,
} from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { isNextRedirect, logServerError, publicErrorMessage } from "@/lib/public-error";
import {
  createPriceYear,
  nextBatchForYear,
  updatePriceYear,
  type CreatePriceYearInput,
  type RevisePriceYearInput,
} from "@/lib/prices";

export type ActionState = {
  ok: boolean;
  message: string;
};

function money(formData: FormData, key: string, label: string): number {
  return parseMoney(String(formData.get(key) ?? ""), label);
}

function moneyFields(formData: FormData): Omit<CreatePriceYearInput, "costNote"> {
  return {
    year: requiredYear(String(formData.get("year") ?? "")),
    riceCostPerJin: money(formData, "riceCostPerJin", "大米成本"),
    shippingFeePerJin: money(formData, "shippingFeePerJin", "运费"),
    vacuumFeePerJin: money(formData, "vacuumFeePerJin", "真空费"),
    retailPlainPerJin: money(formData, "retailPlainPerJin", "普通零售价"),
    retailVacuumPerJin: money(formData, "retailVacuumPerJin", "普通真空零售价"),
    vipPlainPerJin: money(formData, "vipPlainPerJin", "VIP零售价"),
    vipVacuumPerJin: money(formData, "vipVacuumPerJin", "VIP真空零售价"),
    jinPerPack: parsePositiveInt(
      String(formData.get("jinPerPack") ?? ""),
      "每包斤数",
      LIMITS.jinPerPackMax,
    ),
  };
}

/** Preview only — real batch is assigned server-side on save. */
export async function nextPriceBatchForYearAction(yearRaw: string): Promise<string> {
  try {
    await requirePricing();
    const year = parseYear(yearRaw);
    if (year == null) return "";
    return await nextBatchForYear(year);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("nextPriceBatchForYear", error);
    return "";
  }
}

export async function createPriceYearAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePricing();
    const result = await createPriceYear({
      ...moneyFields(formData),
      costNote: optionalText(
        String(formData.get("costNote") ?? ""),
        "备注",
        LIMITS.costNote,
      ),
    });
    revalidatePath("/prices");
    revalidatePath("/orders");
    // Land on confirmation only — no list / no saved row below the form.
    redirect(`/prices/saved?year=${result.year}&batch=${result.batch}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("createPriceYear", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "创建失败"),
    };
  }
}

export async function updatePriceYearAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePricing();
    const input: RevisePriceYearInput = {
      ...moneyFields(formData),
      sourceBatch: requiredBatch(String(formData.get("sourceBatch") ?? "")),
      costNote: optionalText(
        String(formData.get("costNote") ?? ""),
        "备注",
        LIMITS.costNote,
      ),
    };
    const result = await updatePriceYear(input);
    revalidatePath("/prices");
    revalidatePath("/orders");
    // Land on confirmation only — no filtered list of the new row.
    redirect(`/prices/saved?year=${result.year}&batch=${result.batch}`);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logServerError("updatePriceYear", error);
    return {
      ok: false,
      message: publicErrorMessage(error, "保存失败"),
    };
  }
}
