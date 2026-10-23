import Link from "next/link";
import { importCustomersAction } from "@/app/customers/actions";
import { clipDisplay } from "@/lib/input";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function CustomerImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = clipDisplay(one(sp.error), 300);
  const created = one(sp.created);
  const addresses = one(sp.addresses);
  const skipped = one(sp.skipped);
  const failed = one(sp.failed);
  const failedDetail = clipDisplay(one(sp.failedDetail), 2000);
  const hasResult = created !== "" || addresses !== "" || skipped !== "" || failed !== "";

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">批量导入客户</h1>
          <p className="page-desc">
            支持 .xlsx / .csv。表头：姓名 | 来源 | 收件人 | 电话 | 地址。同名追加地址，新姓名建客户。
          </p>
        </div>
        <Link className="btn-secondary" href="/customers">
          返回客户
        </Link>
      </div>

      <div className="panel">
        <form className="write-form" action={importCustomersAction}>
          <label className="full">
            选择文件（最多 500 行，2MB）
            <input type="file" name="file" accept=".xlsx,.xls,.csv" required />
          </label>
          <div className="actions">
            <button type="submit">开始导入</button>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
        {hasResult ? (
          <>
            <ul className="stat-row">
              <li>
                <strong>{created || "0"}</strong>
                <span>新建客户</span>
              </li>
              <li>
                <strong>{addresses || "0"}</strong>
                <span>新增地址</span>
              </li>
              <li>
                <strong>{skipped || "0"}</strong>
                <span>跳过</span>
              </li>
              <li className={Number(failed) > 0 ? "warn" : undefined}>
                <strong>{failed || "0"}</strong>
                <span>失败</span>
              </li>
            </ul>
            {failedDetail ? (
              <ul className="import-failures">
                {failedDetail.split("|").map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
