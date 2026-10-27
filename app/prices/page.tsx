import Link from "next/link";
import { query } from "@/lib/db";
import { CreatePriceForm } from "@/app/prices/CreatePriceForm";
import { canSeePriceCost, canWritePrices } from "@/lib/access";
import { INVALID_FILTER_MESSAGE, parseBatch, parseYear } from "@/lib/input";
import { requirePageArea } from "@/lib/page-access";
import { logServerError, publicErrorMessage } from "@/lib/public-error";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PriceRow = {
  year: number;
  batch: string;
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
  const access = await requirePageArea("prices");
  if (!access.ok) {
    return (
      <>
        <h1 className="page-title">无权访问</h1>
        <p className="error">{access.message}</p>
      </>
    );
  }

  const canWrite = canWritePrices(access.user.role);
  const showCost = canSeePriceCost(access.user.role);

  const sp = await searchParams;
  const year = one(sp.year).trim();
  const batch = one(sp.batch).trim();

  const where: string[] = [];
  const params: unknown[] = [];
  let invalidFilter = false;

  if (year) {
    const parsed = parseYear(year);
    if (parsed == null) {
      invalidFilter = true;
      where.push("FALSE");
    } else {
      params.push(parsed);
      where.push(`year = $${params.length}`);
    }
  }
  // Batch filter is optional for listing; never auto-filled — empty means no batch filter.
  if (batch) {
    const parsed = parseBatch(batch);
    if (parsed == null) {
      invalidFilter = true;
      where.push("FALSE");
    } else {
      params.push(parsed);
      where.push(`batch = $${params.length}`);
    }
  }

  const sql = `
    SELECT
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
    FROM rice_year_prices
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY year DESC, batch ASC
    LIMIT 200
  `;

  let rows: PriceRow[] = [];
  let error: string | null = null;
  try {
    rows = await query<PriceRow>(sql, params);
  } catch (e) {
    logServerError("prices list", e);
    error = publicErrorMessage(e, "查询失败");
  }

  const currentYear = new Date().getFullYear();
  let defaultYear = currentYear;
  try {
    const years = await query<{ year: number }>(
      `SELECT DISTINCT year FROM rice_year_prices ORDER BY year DESC`,
    );
    const takenYears = new Set(years.map((y) => y.year));
    if (takenYears.has(currentYear)) {
      defaultYear = (years[0]?.year ?? currentYear) + 1;
    }
  } catch {
    /* 表单仍可用当前年作为默认 */
  }

  const filtered = Boolean(year || batch);

  return (
    <>
      <h1 className="page-title">{showCost ? "成本 / 年份价目" : "年份售价"}</h1>
      <p className="page-desc">
        {canWrite
          ? "定价员可按年+批次维护价目。批次每年从 00 起（00、01、02…），须手动填写；系统不会自动选用。金额单位元/斤。"
          : "系统用户只读查看四档售价。下单时须手动选年份，再从该年已有批次下拉选择；不会自动带出批次。"}
      </p>

      {canWrite ? (
        <div className="panel">
          <CreatePriceForm defaultYear={defaultYear} />
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>价目列表</h2>
          {!error && rows.length > 0 ? (
            <p className="meta">共 {rows.length} 条</p>
          ) : null}
        </div>
        <form className="filters" method="get">
          <label>
            年份
            <input name="year" defaultValue={year} placeholder="如 2026" inputMode="numeric" />
          </label>
          <label>
            批次
            <input
              name="batch"
              defaultValue={batch}
              placeholder="如 00（可选）"
              maxLength={2}
              title="留空则不按批次过滤；不会自动填入"
              autoComplete="off"
            />
          </label>
          <div className="actions">
            <button type="submit">筛选</button>
            <a href="/prices">清空</a>
          </div>
        </form>

        {invalidFilter ? <p className="error">{INVALID_FILTER_MESSAGE}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">
            {filtered
              ? "没有符合条件的价目。"
              : canWrite
                ? "暂无价目。可在上方新建一年+批次。"
                : "暂无价目。请联系定价员维护。"}
          </p>
        ) : null}
        {!error && rows.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>年份</th>
                  <th>批次</th>
                  {showCost ? (
                    <>
                      <th className="num">成本</th>
                      <th className="num">运费</th>
                      <th className="num">真空费</th>
                    </>
                  ) : null}
                  <th className="num">零售普通</th>
                  <th className="num">零售真空</th>
                  <th className="num">VIP 普通</th>
                  <th className="num">VIP 真空</th>
                  <th className="num">每包斤数</th>
                  {canWrite ? <th>操作</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.year}-${row.batch}`}>
                    <td className="emph">{row.year}</td>
                    <td>{row.batch}</td>
                    {showCost ? (
                      <>
                        <td className="num">{row.rice_cost_per_jin}</td>
                        <td className="num">{row.shipping_fee_per_jin}</td>
                        <td className="num">{row.vacuum_fee_per_jin}</td>
                      </>
                    ) : null}
                    <td className="num">{row.retail_plain_per_jin}</td>
                    <td className="num">{row.retail_vacuum_per_jin}</td>
                    <td className="num">{row.vip_plain_per_jin}</td>
                    <td className="num">{row.vip_vacuum_per_jin}</td>
                    <td className="num">{row.jin_per_pack}</td>
                    {canWrite ? (
                      <td>
                        <Link
                          className="linkish"
                          href={`/prices/${row.year}/${row.batch}/edit`}
                        >
                          修改
                        </Link>
                      </td>
                    ) : null}
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
