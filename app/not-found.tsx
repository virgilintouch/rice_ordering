import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="page-title">没有找到这一页</h1>
      <p className="page-desc">记录可能已删除，或地址不正确。</p>
      <p className="empty">从下面返回继续处理订单或客户。</p>
      <div className="page-actions">
        <Link className="btn-secondary" href="/orders">
          订单
        </Link>
        <Link className="btn-secondary" href="/customers">
          客户
        </Link>
        <Link className="btn-secondary" href="/">
          首页
        </Link>
      </div>
    </>
  );
}
