import { query, withTransaction } from "@/lib/db";

export type PriceTier =
  | "retail_plain"
  | "retail_vacuum"
  | "vip_plain"
  | "vip_vacuum";

export type CreateOrderInput = {
  customerId: number;
  addressId: number;
  priceYear: number;
  priceTier: PriceTier;
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
  if (!Number.isInteger(input.packCount) || input.packCount <= 0) {
    throw new Error("包数必须为正整数");
  }
  if (!(input.priceTier in TIER_COLUMNS)) {
    throw new Error("无效价档");
  }

  return withTransaction(async (q) => {
    const customers = await q<{ id: number; status: string }>(
      `SELECT id, status FROM customers WHERE id = $1 AND deleted_at IS NULL`,
      [input.customerId],
    );
    if (!customers[0]) throw new Error("客户不存在");
    if (customers[0].status !== "active") throw new Error("客户已停用，不能下单");

    const addresses = await q<{
      id: number;
      recipient_name: string;
      recipient_phone: string;
      address: string;
    }>(
      `SELECT id, recipient_name, recipient_phone, address
       FROM customer_addresses
       WHERE id = $1 AND customer_id = $2 AND is_active = true`,
      [input.addressId, input.customerId],
    );
    if (!addresses[0]) throw new Error("地址不存在或不属于该客户");

    const priceCol = TIER_COLUMNS[input.priceTier];
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
      [input.priceYear],
    );
    if (!prices[0]) throw new Error(`找不到 ${input.priceYear} 年价目`);

    const unit = Number(prices[0].unit_price_per_jin);
    const jinPerPack = Number(prices[0].jin_per_pack);
    const riceCost = Number(prices[0].rice_cost_per_jin);
    const shipping = Number(prices[0].shipping_fee_per_jin);
    const vacuum = isVacuumTier(input.priceTier)
      ? Number(prices[0].vacuum_fee_per_jin)
      : 0;
    const amount = (unit * jinPerPack * input.packCount).toFixed(2);
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
        input.customerId,
        input.addressId,
        input.priceYear,
        addr.recipient_name,
        addr.recipient_phone,
        addr.address,
        input.priceTier,
        input.packCount,
        jinPerPack,
        unit.toFixed(2),
        riceCost.toFixed(2),
        shipping.toFixed(2),
        vacuum.toFixed(2),
        amount,
        input.note?.trim() || null,
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
  const rows = await query<{ id: number; status: string }>(
    `SELECT id, status FROM orders WHERE id = $1`,
    [orderId],
  );
  if (!rows[0]) throw new Error("订单不存在");

  const next = NEXT_STATUS[rows[0].status];
  if (!next) throw new Error("订单已签收，不能再推进");

  const timeCol =
    next === "paid" ? "paid_at" : next === "shipped" ? "shipped_at" : "delivered_at";

  await query(
    `UPDATE orders
     SET status = $2,
         ${timeCol} = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [orderId, next],
  );
  return next;
}
