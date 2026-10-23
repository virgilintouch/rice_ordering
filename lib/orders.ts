import { query, withTransaction } from "@/lib/db";
import { optionalText, requiredId } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { PublicError } from "@/lib/public-error";

export type PriceTier =
  | "retail_plain"
  | "retail_vacuum"
  | "vip_plain"
  | "vip_vacuum";

export type CreateOrderInput = {
  customerId: number;
  addressId: number;
  priceYear: number;
  priceTier: string;
  packCount: number;
  note?: string;
};

const TIER_COLUMNS: Record<PriceTier, string> = {
  retail_plain: "retail_plain_per_jin",
  retail_vacuum: "retail_vacuum_per_jin",
  vip_plain: "vip_plain_per_jin",
  vip_vacuum: "vip_vacuum_per_jin",
};

function isVacuumTier(tier: PriceTier): boolean {
  return tier === "retail_vacuum" || tier === "vip_vacuum";
}

function parseTier(tier: string): PriceTier {
  switch (tier) {
    case "retail_plain":
    case "retail_vacuum":
    case "vip_plain":
    case "vip_vacuum":
      return tier;
    default:
      throw new PublicError("无效价档");
  }
}

async function nextOrderNo(q: typeof query = query): Promise<string> {
  const day = new Date();
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  const prefix = `O${y}${m}${d}-`;

  const rows = await q<{ next: number }>(
    `SELECT COALESCE(MAX(CAST(RIGHT(order_no, 4) AS INTEGER)), 0) + 1 AS next
     FROM orders
     WHERE order_no LIKE $1`,
    [`${prefix}%`],
  );
  const n = rows[0]?.next ?? 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<{ orderNo: string; amount: string }> {
  const customerId = requiredId(input.customerId, "客户");
  const addressId = requiredId(input.addressId, "地址");
  const packCount = input.packCount;
  if (!Number.isInteger(packCount) || packCount <= 0 || packCount > LIMITS.packCountMax) {
    throw new PublicError(`包数须为 1–${LIMITS.packCountMax} 的整数`);
  }
  const priceYear = input.priceYear;
  if (!Number.isInteger(priceYear) || priceYear < 2000 || priceYear > 2100) {
    throw new PublicError("年份须为 2000–2100 的整数");
  }
  const priceTier = parseTier(input.priceTier);
  const priceCol = TIER_COLUMNS[priceTier];
  const note = optionalText(input.note, "备注", LIMITS.orderNote);

  return withTransaction(async (q) => {
    const customers = await q<{ id: number; status: string }>(
      `SELECT id, status FROM customers WHERE id = $1 AND deleted_at IS NULL`,
      [customerId],
    );
    if (!customers[0]) throw new PublicError("客户不存在");
    if (customers[0].status !== "active") throw new PublicError("客户已停用，不能下单");

    const addresses = await q<{
      id: number;
      recipient_name: string;
      recipient_phone: string;
      address: string;
    }>(
      `SELECT id, recipient_name, recipient_phone, address
       FROM customer_addresses
       WHERE id = $1 AND customer_id = $2 AND is_active = true`,
      [addressId, customerId],
    );
    if (!addresses[0]) throw new PublicError("地址不存在或不属于该客户");

    const prices = await q<Record<string, unknown>>(
      `SELECT
         year,
         rice_cost_per_jin,
         shipping_fee_per_jin,
         vacuum_fee_per_jin,
         jin_per_pack,
         ${priceCol} AS unit_price_per_jin
       FROM rice_year_prices
       WHERE year = $1`,
      [priceYear],
    );
    if (!prices[0]) throw new PublicError(`找不到 ${priceYear} 年价目`);

    const unit = Number(prices[0].unit_price_per_jin);
    const jinPerPack = Number(prices[0].jin_per_pack);
    const riceCost = Number(prices[0].rice_cost_per_jin);
    const shipping = Number(prices[0].shipping_fee_per_jin);
    const vacuum = isVacuumTier(priceTier)
      ? Number(prices[0].vacuum_fee_per_jin)
      : 0;
    const amountNumber = unit * jinPerPack * packCount;
    if (
      !Number.isFinite(amountNumber) ||
      amountNumber <= 0 ||
      amountNumber > LIMITS.orderAmountMax
    ) {
      throw new PublicError("订单金额超出范围");
    }
    const amount = amountNumber.toFixed(2);
    const orderNo = await nextOrderNo(q);
    const addr = addresses[0];

    await q(
      `INSERT INTO orders (
         order_no, customer_id, address_id, price_year,
         recipient_name, recipient_phone, address,
         price_tier, pack_count, jin_per_pack,
         unit_price_per_jin, rice_cost_per_jin, shipping_fee_per_jin, vacuum_fee_per_jin,
         amount, status, ordered_at, note
       ) VALUES (
         $1,$2,$3,$4,
         $5,$6,$7,
         $8,$9,$10,
         $11,$12,$13,$14,
         $15,'ordered',NOW(),$16
       )`,
      [
        orderNo,
        customerId,
        addressId,
        priceYear,
        addr.recipient_name,
        addr.recipient_phone,
        addr.address,
        priceTier,
        packCount,
        jinPerPack,
        unit.toFixed(2),
        riceCost.toFixed(2),
        shipping.toFixed(2),
        vacuum.toFixed(2),
        amount,
        note,
      ],
    );

    return { orderNo, amount };
  });
}

const NEXT_STATUS: Record<string, "paid" | "shipped" | "delivered" | null> = {
  ordered: "paid",
  paid: "shipped",
  shipped: "delivered",
  delivered: null,
};

export async function advanceOrderStatus(orderId: number): Promise<string> {
  const id = requiredId(orderId, "订单");
  const rows = await query<{ id: number; status: string }>(
    `SELECT id, status FROM orders WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw new PublicError("订单不存在");

  const next = NEXT_STATUS[rows[0].status];
  if (!next) throw new PublicError("订单已签收，不能再推进");

  const timeCol =
    next === "paid" ? "paid_at" : next === "shipped" ? "shipped_at" : "delivered_at";

  await query(
    `UPDATE orders
     SET status = $2,
         ${timeCol} = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id, next],
  );
  return next;
}
