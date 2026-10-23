import Link from "next/link";
import { query } from "@/lib/db";
import { Badge } from "@/app/components/Badge";
import { ACCOUNT_STATUS_LABEL, labelOf } from "@/app/labels";
import { CreateCustomerForm } from "@/app/customers/CreateCustomerForm";
import { RowActions } from "@/app/customers/RowActions";
import { ilikeContains, INVALID_FILTER_MESSAGE } from "@/lib/input";
import { LIMITS } from "@/lib/limits";
import { logServerError, publicErrorMessage } from "@/lib/public-error";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type CustomerRow = {
  id: number;
  code: string;
  name: string;
  source: string;
  status: string;
  address_id: number | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  address: string | null;
  label: string | null;
};

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/** 支持中英文逗号、顿号分隔：王，张 / 王,张 / 王、张 */
function splitKeywords(raw: string): string[] {
  return raw
    .split(/[,，、]+/)
    .map((s) => s.replace(/\u0000/g, "").trim())
    .filter(Boolean);
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const source = one(sp.source).trim();
  const status = one(sp.status).trim();
  const name = one(sp.name).trim();
  const recipient = one(sp.recipient).trim();

  const where: string[] = ["c.deleted_at IS NULL"];
  const params: unknown[] = [];
  let invalidFilter = false;
  const markInvalid = () => {
    invalidFilter = true;
    where.push("FALSE");
  };

  if (source) {
    if (source.length > LIMITS.source) markInvalid();
    else {
      params.push(source);
      where.push(`c.source = $${params.length}`);
    }
  }
  if (status) {
    if (status !== "active" && status !== "disabled") markInvalid();
    else {
      params.push(status);
      where.push(`c.status = $${params.length}`);
    }
  }

  // 多关键词：任一命中客户姓名或收件人姓名即显示（两框关键词合并）
  const nameKeywords = [
    ...new Set([...splitKeywords(name), ...splitKeywords(recipient)]),
  ];
  if (
    nameKeywords.length > LIMITS.keywordCountMax ||
    nameKeywords.some((kw) => kw.length > LIMITS.keywordMax)
  ) {
    markInvalid();
  } else if (nameKeywords.length > 0) {
    const parts = nameKeywords.map((kw) => {
      params.push(ilikeContains(kw));
      const i = params.length;
      return `(c.name ILIKE $${i} ESCAPE '\\' OR a.recipient_name ILIKE $${i} ESCAPE '\\')`;
    });
    where.push(`(${parts.join(" OR ")})`);
  }

  const sql = `
    SELECT
      c.id,
      c.code,
      c.name,
      c.source,
      c.status,
      a.id AS address_id,
      a.recipient_name,
      a.recipient_phone,
      a.address,
      a.label
    FROM customers c
    LEFT JOIN customer_addresses a
      ON a.customer_id = c.id AND a.is_active = true
    WHERE ${where.join(" AND ")}
    ORDER BY c.code, a.id NULLS LAST
    LIMIT 200
  `;

  let rows: CustomerRow[] = [];
  let error: string | null = null;
  try {
    rows = await query<CustomerRow>(sql, params);
  } catch (e) {
    logServerError("customers list", e);
    error = publicErrorMessage(e, "查询失败");
  }

  const filtered = Boolean(source || status || name || recipient);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">客户</h1>
          <p className="page-desc">
            新建、导入、筛选与启停用。客户姓名 / 收件人支持「王，张」多词模糊：命中客户名或收件人即显示。最多 200 行。
          </p>
        </div>
        <Link className="btn-secondary" href="/customers/import">
          批量导入
        </Link>
      </div>

      <div className="panel">
        <CreateCustomerForm />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>客户列表</h2>
          {!error && rows.length > 0 ? (
            <p className="meta">
              共 {rows.length} 行{rows.length >= 200 ? "（已达 200 行上限）" : ""}
            </p>
          ) : null}
        </div>
        <form className="filters" method="get">
          <label>
            来源
            <input name="source" defaultValue={source} />
          </label>
          <label>
            状态
            <select name="status" defaultValue={status}>
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>
          </label>
          <label>
            客户姓名
            <input
              name="name"
              defaultValue={name}
              title="支持逗号分隔多个词，如 王，张；会同时匹配客户姓名与收件人"
            />
          </label>
          <label>
            收件人姓名
            <input
              name="recipient"
              defaultValue={recipient}
              title="支持逗号分隔多个词，如 王，张；会同时匹配客户姓名与收件人"
            />
          </label>
          <div className="actions">
            <button type="submit">筛选</button>
            <a href="/customers">清空</a>
          </div>
        </form>

        {invalidFilter ? <p className="error">{INVALID_FILTER_MESSAGE}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">
            {filtered ? "没有符合筛选条件的客户。" : "暂无客户。可在上方新建，或批量导入。"}
          </p>
        ) : null}
        {!error && rows.length > 0 ? (
          <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>编号</th>
                    <th>姓名</th>
                    <th>来源</th>
                    <th>收件人</th>
                    <th>电话</th>
                    <th>地址</th>
                    <th>地址标签</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={`${row.id}-${row.address_id ?? "none"}`}>
                      <td className="emph">{row.code}</td>
                      <td>{row.name}</td>
                      <td>{row.source}</td>
                      <td>{row.recipient_name ?? "—"}</td>
                      <td>{row.recipient_phone ?? "—"}</td>
                      <td className="cell-wrap">{row.address ?? "—"}</td>
                      <td>{row.label ?? "—"}</td>
                      <td>
                        <Badge value={row.status}>
                          {labelOf(ACCOUNT_STATUS_LABEL, row.status)}
                        </Badge>
                      </td>
                      <td>
                        <RowActions
                          customerId={row.id}
                          addressId={row.address_id}
                          customerName={row.name}
                          status={row.status}
                        />
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
