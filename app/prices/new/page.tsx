import Link from "next/link";
import { CreatePriceForm } from "@/app/prices/CreatePriceForm";
import { canWritePrices } from "@/lib/access";
import { requirePageArea } from "@/lib/page-access";

export default async function NewPricePage() {
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
        <p className="error">只有定价员可以新建价目。</p>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">新建价目</h1>
          <p className="page-desc">保存后不展示列表；点返回可查看全部价目。</p>
        </div>
        <Link className="btn-secondary" href="/prices">
          返回
        </Link>
      </div>
      <div className="panel">
        <CreatePriceForm />
      </div>
    </>
  );
}
