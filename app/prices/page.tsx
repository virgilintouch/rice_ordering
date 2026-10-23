import { query } from "@/lib/db";
import { CreatePriceForm } from "@/app/prices/CreatePriceForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PriceRow = {
  year: number;
  rice_cost_per_jin: string;
  shipping_fee_per_jin: string;
  vacuum_fee_per_jin: string;
  retail_plain_per_jin: string;
  retail_vacuum_per_jin: string;
  vip_plain_per_jin: string;
  vip_vacuum_per_jin: string;
  jin_per_pack: number;
};

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function PricesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const year = one(sp.year).trim();

  const where: string[] = [];
  const params: unknown[] = [];

  if (year) {
    params.push(Number(year));
    where.push(`year = $${params.length}`);
  }

  const sql = `
    SELECT
      year,
      rice_cost_per_jin,
      shipping_fee_per_jin,
      vacuum_fee_per_jin,
      retail_plain_per_jin,
      retail_vacuum_per_jin,
      vip_plain_per_jin,
      vip_vacuum_per_jin,
      jin_per_pack
    FROM rice_year_prices
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY year DESC
    LIMIT 200
  `;

  let rows: PriceRow[] = [];
  let error: string | null = null;
  try {
    rows = await query<PriceRow>(sql, params);
  } catch (e) {
    error = e instanceof Error ? e.message : "查询失败";
  }

  const currentYear = new Date().getFullYear();
  let defaultYear = currentYear;
  try {
    const years = await query<{ year: number }>(
      `SELECT year FROM rice_year_prices ORDER BY year DESC`,
    );
    const taken = new Set(years.map((y) => y.year));
    if (taken.has(currentYear)) {
      defaultYear = (years[0]?.year ?? currentYear) + 1;
    }
  } catch {
    /* 表单仍可用当前年作为默认 */
  }

  return (
    <>
      <h1 className="page-title">成本 / 年份价目</h1>
      <p className="page-desc">
        按年份维护成本、运费、真空费与四档售价；可筛选查看，也可新建一年价目。
      </p>

      <div className="panel">
        <CreatePriceForm defaultYear={defaultYear} />
      </div>

      <div className="panel">
        <form className="filters" method="get">
          <label>
            年份
            <input name="year" defaultValue={year} placeholder="如 2026" inputMode="numeric" />
          </label>
          <div className="actions">
            <button type="submit">筛选</button>
            <a href="/prices">清空</a>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">暂无价目数据。</p>
        ) : null}
        {!error && rows.length > 0 ? (
          <>
            <p className="meta">共 {rows.length} 条</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>年份</th>
                    <th>成本</th>
                    <th>运费</th>
                    <th>真空费</th>
                    <th>零售普通</th>
                    <th>零售真空</th>
                    <th>VIP普通</th>
                    <th>VIP真空</th>
                    <th>每包斤数</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.year}>
                      <td>{row.year}</td>
                      <td>{row.rice_cost_per_jin}</td>
                      <td>{row.shipping_fee_per_jin}</td>
                      <td>{row.vacuum_fee_per_jin}</td>
                      <td>{row.retail_plain_per_jin}</td>
                      <td>{row.retail_vacuum_per_jin}</td>
                      <td>{row.vip_plain_per_jin}</td>
                      <td>{row.vip_vacuum_per_jin}</td>
                      <td>{row.jin_per_pack}</td>
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
