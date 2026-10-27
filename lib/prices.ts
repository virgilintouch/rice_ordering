import { query } from "@/lib/db";
import {
  assertMoneyNumber,
  optionalText,
  parseBatch,
  requiredBatch,
  requiredYear,
} from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { PublicError } from "@/lib/public-error";

export type PriceMoneyInput = {
  year: number;
  riceCostPerJin: number;
  shippingFeePerJin: number;
  vacuumFeePerJin: number;
  retailPlainPerJin: number;
  retailVacuumPerJin: number;
  vipPlainPerJin: number;
  vipVacuumPerJin: number;
  jinPerPack: number;
  /** Remarks; required unless the assigned batch is 00. */
  costNote?: string | null;
};

export type CreatePriceYearInput = PriceMoneyInput;

export type RevisePriceYearInput = PriceMoneyInput & {
  /** Existing row being revised; a new auto batch is inserted (no in-place overwrite, no delete). */
  sourceBatch: string;
};

function assertMoneyFields(input: PriceMoneyInput): void {
  const year = input.year;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new PublicError("年份须为 2000–2100 的整数");
  }

  assertMoneyNumber(input.riceCostPerJin, "大米成本");
  assertMoneyNumber(input.shippingFeePerJin, "运费");
  assertMoneyNumber(input.vacuumFeePerJin, "真空费");
  assertMoneyNumber(input.retailPlainPerJin, "普通零售价");
  assertMoneyNumber(input.retailVacuumPerJin, "普通真空零售价");
  assertMoneyNumber(input.vipPlainPerJin, "VIP零售价");
  assertMoneyNumber(input.vipVacuumPerJin, "VIP真空零售价");

  if (
    !Number.isInteger(input.jinPerPack) ||
    input.jinPerPack <= 0 ||
    input.jinPerPack > LIMITS.jinPerPackMax
  ) {
    throw new PublicError(`每包斤数须为 1–${LIMITS.jinPerPackMax} 的整数`);
  }
}

/** Remarks: required for batch 01+, optional only for the year's first batch 00. */
export function assertCostNoteForBatch(
  batch: string,
  costNote: string | null | undefined,
): string | null {
  const note = optionalText(costNote ?? "", "备注", LIMITS.costNote);
  if (batch === "00") return note;
  if (!note) throw new PublicError("批次非 00 时备注为必填");
  return note;
}

/**
 * Next batch for a year: 00 if none, else max existing + 1 (two digits).
 * Batch is never typed by the user — server assigns only.
 */
export async function nextBatchForYear(year: number): Promise<string> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new PublicError("年份须为 2000–2100 的整数");
  }
  const rows = await query<{ batch: string }>(
    `SELECT batch
     FROM rice_year_prices
     WHERE year = $1
     ORDER BY batch DESC
     LIMIT 1`,
    [year],
  );
  if (!rows[0]) return "00";
  const current = Number(rows[0].batch);
  if (!Number.isInteger(current) || current < 0 || current >= 99) {
    throw new PublicError(`${year} 年批次已满，无法再新增`);
  }
  return String(current + 1).padStart(2, "0");
}

async function insertPriceRow(
  input: PriceMoneyInput,
  batch: string,
): Promise<{ year: number; batch: string }> {
  const year = input.year;
  const costNote = assertCostNoteForBatch(batch, input.costNote);

  await query(
    `INSERT INTO rice_year_prices (
       year,
       batch,
       rice_cost_per_jin,
       shipping_fee_per_jin,
       vacuum_fee_per_jin,
       retail_plain_per_jin,
       retail_vacuum_per_jin,
       vip_plain_per_jin,
       vip_vacuum_per_jin,
       jin_per_pack,
       cost_note
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      year,
      batch,
      input.riceCostPerJin,
      input.shippingFeePerJin,
      input.vacuumFeePerJin,
      input.retailPlainPerJin,
      input.retailVacuumPerJin,
      input.vipPlainPerJin,
      input.vipVacuumPerJin,
      input.jinPerPack,
      costNote,
    ],
  );

  return { year, batch };
}

/** New cost row: batch auto-assigned (00, then 01…). No delete path. */
export async function createPriceYear(
  input: CreatePriceYearInput,
): Promise<{ year: number; batch: string }> {
  assertMoneyFields(input);
  const year = requiredYear(String(input.year));
  const batch = await nextBatchForYear(year);
  return insertPriceRow({ ...input, year }, batch);
}

/**
 * Revise cost: always inserts a new auto batch for the year.
 * Existing rows are never overwritten or deleted (update-only table, versioned by batch).
 */
export async function updatePriceYear(
  input: RevisePriceYearInput,
): Promise<{ year: number; batch: string }> {
  assertMoneyFields(input);
  const year = requiredYear(String(input.year));
  const sourceBatch = requiredBatch(input.sourceBatch);

  const existing = await query<{ year: number }>(
    `SELECT year FROM rice_year_prices WHERE year = $1 AND batch = $2`,
    [year, sourceBatch],
  );
  if (!existing[0]) {
    throw new PublicError(`${year} 年批次 ${sourceBatch} 价目不存在`);
  }

  const batch = await nextBatchForYear(year);
  return insertPriceRow({ ...input, year }, batch);
}

/** Batches that already exist for a year in rice_year_prices. Empty if none. */
export async function listBatchesForYear(year: number): Promise<string[]> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return [];
  }
  const rows = await query<{ batch: string }>(
    `SELECT batch
     FROM rice_year_prices
     WHERE year = $1
     ORDER BY batch ASC`,
    [year],
  );
  return rows.map((r) => r.batch);
}
