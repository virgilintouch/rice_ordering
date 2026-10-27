import Link from "next/link";
import { notFound } from "next/navigation";
import { EditPriceForm } from "@/app/prices/EditPriceForm";
import { canWritePrices } from "@/lib/access";
import { query } from "@/lib/db";
import { parseBatch, parseYear } from "@/lib/input";
import { requirePageArea } from "@/lib/page-access";
import { logServerError } from "@/lib/public-error";

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
  cost_note: string | null;
};

export default async function EditPricePage({
  params,
}: {
  params: Promise<{ year: string; batch: string }>;
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
        <p className="error">只有定价员可以修改价目。</p>
      </>
    );
  }

  const { year: yearRaw, batch: batchRaw } = await params;
  const year = parseYear(yearRaw);
  const batch = parseBatch(batchRaw);
  // Batch must be in the URL — never invent one.
  if (year == null || batch == null) notFound();

  let row: PriceRow | undefined;
  try {
    const rows = await query<PriceRow>(
      `SELECT
         year,
         batch,
         rice_cost_per_jin,
         shipping_fee_per_jin,
         vacuum_fee_per_jin,
         retail_plain_per_jin,
         retail_vacuum_per_jin,
         vip_plain_per_jin,
         vip_vacuum_per_jin,
         jin_per_pack,
         cost_note
       FROM rice_year_prices
       WHERE year = $1 AND batch = $2`,
      [year, batch],
    );
    row = rows[0];
  } catch (error) {
    logServerError("editPrice", error);
    return (
      <>
        <h1 className="page-title">修改价目</h1>
        <p className="error">加载失败</p>
      </>
    );
  }
  if (!row) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            修订 {row.year} 年批次 {row.batch} 价目
          </h1>
          <p className="page-desc">
            保存后生成新批次，不覆盖、不删除原批次。批次号由系统自动分配。
          </p>
        </div>
        <Link className="btn-secondary" href="/prices">
          返回
        </Link>
      </div>
      <div className="panel">
        <EditPriceForm
          values={{
            year: row.year,
            sourceBatch: row.batch,
            riceCostPerJin: row.rice_cost_per_jin,
            shippingFeePerJin: row.shipping_fee_per_jin,
            vacuumFeePerJin: row.vacuum_fee_per_jin,
            retailPlainPerJin: row.retail_plain_per_jin,
            retailVacuumPerJin: row.retail_vacuum_per_jin,
            vipPlainPerJin: row.vip_plain_per_jin,
            vipVacuumPerJin: row.vip_vacuum_per_jin,
            jinPerPack: row.jin_per_pack,
            costNote: row.cost_note ?? "",
          }}
        />
      </div>
    </>
  );
}
