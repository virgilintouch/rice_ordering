import { query } from "@/lib/db";
import { assertMoneyNumber } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { PublicError } from "@/lib/public-error";

export type CreatePriceYearInput = {
  year: number;
  riceCostPerJin: number;
  shippingFeePerJin: number;
  vacuumFeePerJin: number;
  retailPlainPerJin: number;
  retailVacuumPerJin: number;
  vipPlainPerJin: number;
  vipVacuumPerJin: number;
  jinPerPack: number;
};

export async function createPriceYear(
  input: CreatePriceYearInput,
): Promise<{ year: number }> {
  const year = input.year;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new PublicError("年份须为 2000–2100 的整数");
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

  const existing = await query<{ year: number }>(
    `SELECT year FROM rice_year_prices WHERE year = $1`,
    [year],
  );
  if (existing.length > 0) {
    throw new PublicError(`${year} 年价目已存在`);
  }

  await query(
    `INSERT INTO rice_year_prices (
       year,
       rice_cost_per_jin,
       shipping_fee_per_jin,
       vacuum_fee_per_jin,
       retail_plain_per_jin,
       retail_vacuum_per_jin,
       vip_plain_per_jin,
       vip_vacuum_per_jin,
       jin_per_pack
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      year,
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

  return { year };
}
