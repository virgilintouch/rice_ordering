import Link from "next/link";
import { notFound } from "next/navigation";
import { EditPriceForm } from "@/app/prices/EditPriceForm";
import { query } from "@/lib/db";
import { parseYear } from "@/lib/input";
import { logServerError } from "@/lib/public-error";
import { canWritePrices } from "@/lib/access";
import { requirePageArea } from "@/lib/page-access";

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

export default async function EditPricePage({
  params,
}: {
  params: Promise<{ year: string }>;
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
  const { year: yearRaw } = await params;
  const year = parseYear(yearRaw);
  if (year == null) notFound();

  let row: PriceRow | undefined;
  try {
    const rows = await query<PriceRow>(
      `SELECT
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
       WHERE year = $1`,
      [year],
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
          <h1 className="page-title">修改 {row.year} 年价目</h1>
          <p className="page-desc">改这一年的成本、运费、真空费、四档售价和每包斤数。</p>
        </div>
        <Link className="btn-secondary" href="/prices">
          返回价目
        </Link>
      </div>
      <div className="panel">
        <EditPriceForm
          values={{
            year: row.year,
            riceCostPerJin: row.rice_cost_per_jin,
            shippingFeePerJin: row.shipping_fee_per_jin,
            vacuumFeePerJin: row.vacuum_fee_per_jin,
            retailPlainPerJin: row.retail_plain_per_jin,
            retailVacuumPerJin: row.retail_vacuum_per_jin,
            vipPlainPerJin: row.vip_plain_per_jin,
            vipVacuumPerJin: row.vip_vacuum_per_jin,
            jinPerPack: row.jin_per_pack,
          }}
        />
      </div>
    </>
  );
}
