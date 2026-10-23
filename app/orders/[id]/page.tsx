import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import { formatTime } from "@/app/format";
import { ORDER_STATUS_LABEL, PRICE_TIER_LABEL, labelOf } from "@/app/labels";
import { OrderDetailActions } from "@/app/orders/[id]/OrderDetailActions";
import { parseId } from "@/lib/input";
import { logServerError } from "@/lib/public-error";

export const dynamic = "force-dynamic";

type OrderDetail = {
  id: number;
  order_no: string;
  customer_name: string | null;
  status: string;
  price_tier: string;
  pack_count: number;
  jin_per_pack: number;
  unit_price_per_jin: string;
  amount: string;
  recipient_name: string;
  address: string;
  recipient_phone: string;
  ordered_at: Date;
  paid_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
};

async function loadOrder(orderId: number): Promise<OrderDetail | null> {
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return null;
  const rows = await query<OrderDetail>(
    `SELECT
       o.id,
       o.order_no,
       c.name AS customer_name,
       o.status,
       o.price_tier,
       o.pack_count,
       o.jin_per_pack,
       o.unit_price_per_jin,
       o.amount,
       o.recipient_name,
       o.address,
       o.recipient_phone,
       o.ordered_at,
       o.paid_at,
       o.shipped_at,
       o.delivered_at
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = $1`,
    [orderId],
  );
  return rows[0] ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id == null) return { title: "订单详情" };
  try {
    const order = await loadOrder(id);
    if (!order) return { title: "订单详情" };
    const titleNo = order.order_no.replace(/[^\w-]/g, "").slice(0, 32);
    return { title: titleNo ? `订单号-${titleNo}` : "订单详情" };
  } catch (error) {
    logServerError("orderDetailMetadata", error);
    return { title: "订单详情" };
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = parseId(idRaw);
  if (id == null) notFound();
  let order: OrderDetail | null;
  try {
    order = await loadOrder(id);
  } catch (error) {
    logServerError("orderDetail", error);
    return (
      <div className="order-detail-page">
        <h1 className="page-title">订单详情</h1>
        <p className="error">加载失败</p>
      </div>
    );
  }
  if (!order) notFound();

  const fields: { label: string; value: string; wide?: boolean }[] = [
    { label: "订单号", value: order.order_no },
    { label: "状态", value: labelOf(ORDER_STATUS_LABEL, order.status) },
    { label: "客户姓名", value: order.customer_name ?? "—" },
    { label: "价档", value: labelOf(PRICE_TIER_LABEL, order.price_tier) },
    { label: "数量（包）", value: String(order.pack_count) },
    { label: "每包斤数", value: String(order.jin_per_pack) },
    { label: "单价（元/斤）", value: order.unit_price_per_jin },
    { label: "金额（元）", value: order.amount },
    { label: "收件人", value: order.recipient_name },
    { label: "地址", value: order.address, wide: true },
    { label: "电话", value: order.recipient_phone },
    { label: "下单时间", value: formatTime(order.ordered_at) },
    { label: "付款时间", value: formatTime(order.paid_at) },
    { label: "发货时间", value: formatTime(order.shipped_at) },
    { label: "收货时间", value: formatTime(order.delivered_at) },
  ];

  return (
    <div className="order-detail-page">
      <h1 className="page-title">订单详情</h1>
      <p className="page-desc">{order.order_no}</p>

      <div className="panel">
        <dl className="detail-list">
          {fields.map((f) => (
            <div
              key={f.label}
              className={f.wide ? "detail-row detail-row-wide" : "detail-row"}
            >
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <OrderDetailActions />
    </div>
  );
}
