import { query } from "@/lib/db";

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

function assertPositiveMoney(label: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label}须大于 0`);
  }
}

export async function createPriceYear(
  input: CreatePriceYearInput,
): Promise<{ year: number }> {
  const year = input.year;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("年份须为 2000–2100 的整数");
  }

  assertPositiveMoney("大米成本", input.riceCostPerJin);
  assertPositiveMoney("运费", input.shippingFeePerJin);
  assertPositiveMoney("真空费", input.vacuumFeePerJin);
  assertPositiveMoney("零售普通价", input.retailPlainPerJin);
  assertPositiveMoney("零售真空价", input.retailVacuumPerJin);
  assertPositiveMoney("VIP 普通价", input.vipPlainPerJin);
  assertPositiveMoney("VIP 真空价", input.vipVacuumPerJin);

  if (!Number.isInteger(input.jinPerPack) || input.jinPerPack <= 0) {
    throw new Error("每包斤数须为正整数");
  }

  const existing = await query<{ year: number }>(
    `SELECT year FROM rice_year_prices WHERE year = $1`,
    [year],
  );
  if (existing.length > 0) {
    throw new Error(`${year} 年价目已存在`);
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
