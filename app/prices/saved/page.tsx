import Link from "next/link";
import { canWritePrices } from "@/lib/access";
import { parseBatch, parseYear } from "@/lib/input";
import { requirePageArea } from "@/lib/page-access";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/**
 * Post-save landing: success text + 返回 only.
 * Does not show the price list or the saved row.
 */
export default async function PriceSavedPage({
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
  if (!canWritePrices(access.user.role)) {
    return (
      <>
        <h1 className="page-title">无权访问</h1>
        <p className="error">只有定价员可以保存价目。</p>
      </>
    );
  }

  const sp = await searchParams;
  const year = parseYear(one(sp.year).trim());
  const batch = parseBatch(one(sp.batch).trim());
  const message =
    year != null && batch != null
      ? `已保存 ${year} 年批次 ${batch} 价目`
      : "已保存价目";

  return (
    <>
      <h1 className="page-title">保存成功</h1>
      <div className="panel">
        <p className="ok">{message}</p>
        <div className="actions">
          <Link className="btn-secondary" href="/prices">
            返回
          </Link>
        </div>
      </div>
    </>
  );
}
