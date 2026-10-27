import { requirePageArea } from "@/lib/page-access";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const access = await requirePageArea("reports");
  if (!access.ok) {
    return (
      <>
        <h1 className="page-title">无权访问</h1>
        <p className="error">{access.message}</p>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">毛利分析</h1>
      <p className="page-desc">
        按客户、按年汇总与毛利为后续功能。当前为占位页，系统用户可进入，尚无报表数据。
      </p>
      <div className="panel">
        <p className="empty">报表尚未实现。有真实订单数据后再做汇总与毛利计算。</p>
      </div>
    </>
  );
}
