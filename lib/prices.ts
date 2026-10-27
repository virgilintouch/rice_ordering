import { query } from "@/lib/db";
import { assertMoneyNumber, parseBatch, requiredBatch, requiredYear } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { PublicError } from "@/lib/public-error";

export type CreatePriceYearInput = {
  year: number;
  /** Two-digit batch, e.g. 00. Starts at 00 each year. Never auto-chosen. */
  batch: string;
  riceCostPerJin: number;
  shippingFeePerJin: number;
  vacuumFeePerJin: number;
  retailPlainPerJin: number;
  retailVacuumPerJin: number;
  vipPlainPerJin: number;
  vipVacuumPerJin: number;
  jinPerPack: number;
};

function assertPriceYear(input: CreatePriceYearInput): void {
  const year = input.year;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new PublicError("年份须为 2000–2100 的整数");
  }
  if (parseBatch(input.batch) == null) {
    throw new PublicError("批次须为两位数字，如 00、01");
  }

  assertMoneyNumber(input.riceCostPerJin, "大米成本");
  assertMoneyNumber(input.shippingFeePerJin, "运费");
  assertMoneyNumber(input.vacuumFeePerJin, "真空费");
  assertMoneyNumber(input.retailPlainPerJin, "零售普通价");
  assertMoneyNumber(input.retailVacuumPerJin, "零售真空价");
  assertMoneyNumber(input.vipPlainPerJin, "VIP 普通价");
  assertMoneyNumber(input.vipVacuumPerJin, "VIP 真空价");

  if (
    !Number.isInteger(input.jinPerPack) ||
    input.jinPerPack <= 0 ||
    input.jinPerPack > LIMITS.jinPerPackMax
  ) {
    throw new PublicError(`每包斤数须为 1–${LIMITS.jinPerPackMax} 的整数`);
  }
}

export async function createPriceYear(
  input: CreatePriceYearInput,
): Promise<{ year: number; batch: string }> {
  assertPriceYear(input);
  const year = input.year;
  const batch = requiredBatch(input.batch);

  const existing = await query<{ year: number }>(
    `SELECT year FROM rice_year_prices WHERE year = $1 AND batch = $2`,
    [year, batch],
  );
  if (existing.length > 0) {
    throw new PublicError(`${year} 年批次 ${batch} 价目已存在`);
  }

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
       jin_per_pack
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
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
    ],
  );

  return { year, batch };
}

/** Overwrites one year+batch row. Past orders keep their snapshots. */
export async function updatePriceYear(
  input: CreatePriceYearInput,
): Promise<{ year: number; batch: string }> {
  assertPriceYear(input);
  const year = requiredYear(String(input.year));
  const batch = requiredBatch(input.batch);
  const rows = await query<{ year: number; batch: string }>(
    `UPDATE rice_year_prices SET
       rice_cost_per_jin = $3,
       shipping_fee_per_jin = $4,
       vacuum_fee_per_jin = $5,
       retail_plain_per_jin = $6,
       retail_vacuum_per_jin = $7,
       vip_plain_per_jin = $8,
       vip_vacuum_per_jin = $9,
       jin_per_pack = $10
     WHERE year = $1 AND batch = $2
     RETURNING year, batch`,
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
    ],
  );
  if (!rows[0]) throw new PublicError(`${year} 年批次 ${batch} 价目不存在`);
  return { year: rows[0].year, batch: rows[0].batch };
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
