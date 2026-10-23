import Link from "next/link";
import { query } from "@/lib/db";
import { CreateOrderForm } from "@/app/orders/CreateOrderForm";
import { advanceOrderAction } from "@/app/orders/actions";

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

function formatTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN");
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

  if (status) {
    params.push(status);
    where.push(`o.status = $${params.length}`);
  }
  if (customer) {
    params.push(`%${customer}%`);
    where.push(`c.name ILIKE $${params.length}`);
  }
  if (from) {
    params.push(from);
    where.push(`o.ordered_at::date >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    where.push(`o.ordered_at::date <= $${params.length}::date`);
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
    error = e instanceof Error ? e.message : "查询失败";
  }

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
        <form className="filters" method="get">
          <label>
            状态
            <select name="status" defaultValue={status}>
              <option value="">全部</option>
              <option value="ordered">ordered</option>
              <option value="paid">paid</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
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

        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">暂无订单数据。</p>
        ) : null}
        {!error && rows.length > 0 ? (
          <>
            <p className="meta">共 {rows.length} 条</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>客户</th>
                    <th>价档</th>
                    <th>包数</th>
                    <th>金额</th>
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
                      <td>
                        <Link
                          className="linkish"
                          href={`/orders/${row.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {row.order_no}
                        </Link>
                      </td>
                      <td>{row.customer_name ?? "—"}</td>
                      <td>{row.price_tier}</td>
                      <td>{row.pack_count}</td>
                      <td>{row.amount}</td>
                      <td>{row.status}</td>
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
          </>
        ) : null}
      </div>
    </>
  );
}
