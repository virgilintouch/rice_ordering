import Link from "next/link";

const cards = [
  { href: "/orders", title: "订单", desc: "按状态、客户、日期筛选订单" },
  { href: "/customers", title: "客户", desc: "按来源、状态、姓名筛选客户" },
  { href: "/prices", title: "成本", desc: "查看年份价目与成本结构" },
  { href: "/users", title: "用户管理", desc: "后台账号角色与状态" },
];

export default function HomePage() {
  return (
    <>
      <h1 className="page-title">本地台账后台</h1>
      <p className="page-desc">
        第一期：只读列表与筛选。登录、写入与复杂报表后续再做。
      </p>
      <div className="home-grid">
        {cards.map((card) => (
          <Link key={card.href} className="home-card" href={card.href}>
            <strong>{card.title}</strong>
            <span>{card.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
