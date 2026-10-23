import Link from "next/link";
import { query } from "@/lib/db";
import { Badge } from "@/app/components/Badge";
import { formatTime } from "@/app/format";
import { ORDER_STATUS_LABEL, PRICE_TIER_LABEL, labelOf } from "@/app/labels";
import { CreateOrderForm } from "@/app/orders/CreateOrderForm";
import { advanceOrderAction } from "@/app/orders/actions";
import { ilikeContains, INVALID_FILTER_MESSAGE, isIsoDate } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { logServerError, publicErrorMessage } from "@/lib/public-error";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type OrderRow = {
  id: number;
  order_no: string;
  customer_name: string | null;
  price_tier: string;
  pack_count: number;
  amount: string;
  status: string;
  ordered_at: Date;
  paid_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
};

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

const NEXT_LABEL: Record<string, string> = {
  ordered: "标记已付款",
  paid: "标记已发货",
  shipped: "标记已签收",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = one(sp.status).trim();
  const customer = one(sp.customer).trim();
  const from = one(sp.from).trim();
  const to = one(sp.to).trim();

  const where: string[] = [];
  const params: unknown[] = [];
  let invalidFilter = false;
  const markInvalid = () => {
    invalidFilter = true;
    where.push("FALSE");
  };

  if (status) {
    if (
      status !== "ordered" &&
      status !== "paid" &&
      status !== "shipped" &&
      status !== "delivered"
    ) {
      markInvalid();
    } else {
      params.push(status);
      where.push(`o.status = $${params.length}`);
    }
  }
  if (customer) {
    if (customer.length > LIMITS.keywordMax) markInvalid();
    else {
      params.push(ilikeContains(customer));
      where.push(`c.name ILIKE $${params.length} ESCAPE '\\'`);
    }
  }
  if (from) {
    if (!isIsoDate(from)) markInvalid();
    else {
      params.push(from);
      where.push(`o.ordered_at::date >= $${params.length}::date`);
    }
  }
  if (to) {
    if (!isIsoDate(to)) markInvalid();
    else {
      params.push(to);
      where.push(`o.ordered_at::date <= $${params.length}::date`);
    }
  }

  const sql = `
    SELECT
      o.id,
      o.order_no,
      c.name AS customer_name,
      o.price_tier,
      o.pack_count,
      o.amount,
      o.status,
      o.ordered_at,
      o.paid_at,
      o.shipped_at,
      o.delivered_at
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY o.ordered_at DESC, o.id DESC
    LIMIT 200
  `;

  let rows: OrderRow[] = [];
  let error: string | null = null;
  let customers: { id: number; name: string; code: string }[] = [];
  let addresses: {
    id: number;
    customer_id: number;
    recipient_name: string;
    recipient_phone: string;
    address: string;
  }[] = [];
  let prices: {
    year: number;
    rice_cost_per_jin: string;
    jin_per_pack: number;
    retail_plain_per_jin: string;
    retail_vacuum_per_jin: string;
    vip_plain_per_jin: string;
    vip_vacuum_per_jin: string;
  }[] = [];

  try {
    rows = await query<OrderRow>(sql, params);
    customers = await query(
      `SELECT id, name, code FROM customers
       WHERE deleted_at IS NULL AND status = 'active'
       ORDER BY code`,
    );
    addresses = await query(
      `SELECT id, customer_id, recipient_name, recipient_phone, address
       FROM customer_addresses
       WHERE is_active = true
       ORDER BY id`,
    );
    prices = await query(
      `SELECT
         year,
         rice_cost_per_jin,
         jin_per_pack,
         retail_plain_per_jin,
         retail_vacuum_per_jin,
         vip_plain_per_jin,
         vip_vacuum_per_jin
       FROM rice_year_prices
       ORDER BY year DESC`,
    );
  } catch (e) {
    logServerError("orders list", e);
    error = publicErrorMessage(e, "查询失败");
  }

  const filtered = Boolean(status || customer || from || to);

  return (
    <>
      <h1 className="page-title">订单</h1>
      <p className="page-desc">
        先按客户编号 / 姓名筛选并选定客户与地址，再填价档与包数；价目年默认今年。下单自动抄快照。
      </p>

      <div className="panel">
        <CreateOrderForm
          customers={customers}
          addresses={addresses}
          prices={prices}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>订单列表</h2>
          {!error && rows.length > 0 ? (
            <p className="meta">
              共 {rows.length} 条{rows.length >= 200 ? "（已达 200 条上限）" : ""}
            </p>
          ) : null}
        </div>
        <form className="filters" method="get">
          <label>
            状态
            <select name="status" defaultValue={status}>
              <option value="">全部</option>
              <option value="ordered">已下单</option>
              <option value="paid">已付款</option>
              <option value="shipped">已发货</option>
              <option value="delivered">已签收</option>
            </select>
          </label>
          <label>
            客户名
            <input name="customer" defaultValue={customer} placeholder="模糊匹配" />
          </label>
          <label>
            下单日起
            <input type="date" name="from" defaultValue={from} />
          </label>
          <label>
            下单日止
            <input type="date" name="to" defaultValue={to} />
          </label>
          <div className="actions">
            <button type="submit">筛选</button>
            <a href="/orders">清空</a>
          </div>
        </form>

        {invalidFilter ? <p className="error">{INVALID_FILTER_MESSAGE}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">
            {filtered ? "没有符合筛选条件的订单。" : "暂无订单。可在上方新建。"}
          </p>
        ) : null}
        {!error && rows.length > 0 ? (
          <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>客户</th>
                    <th>价档</th>
                    <th className="num">包数</th>
                    <th className="num">金额（元）</th>
                    <th>状态</th>
                    <th>下单时间</th>
                    <th>付款时间</th>
                    <th>发货时间</th>
                    <th>收货时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="emph">
                        <Link
                          className="linkish order-no"
                          href={`/orders/${row.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {row.order_no}
                        </Link>
                      </td>
                      <td>{row.customer_name ?? "—"}</td>
                      <td>{labelOf(PRICE_TIER_LABEL, row.price_tier)}</td>
                      <td className="num">{row.pack_count}</td>
                      <td className="num">{row.amount}</td>
                      <td>
                        <Badge value={row.status}>
                          {labelOf(ORDER_STATUS_LABEL, row.status)}
                        </Badge>
                      </td>
                      <td>{formatTime(row.ordered_at)}</td>
                      <td>{formatTime(row.paid_at)}</td>
                      <td>{formatTime(row.shipped_at)}</td>
                      <td>{formatTime(row.delivered_at)}</td>
                      <td>
                        {NEXT_LABEL[row.status] ? (
                          <form action={advanceOrderAction}>
                            <input type="hidden" name="orderId" value={row.id} />
                            <button type="submit" className="linkish">
                              {NEXT_LABEL[row.status]}
                            </button>
                          </form>
                        ) : row.status === "delivered" ? (
                          <span className="order-done">订单已完成</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
