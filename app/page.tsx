import Link from "next/link";

const cards = [
  { href: "/orders", title: "订单", desc: "下单、推进状态、打开详情打印" },
  { href: "/customers", title: "客户", desc: "新建、导入、筛选与启停用" },
  { href: "/prices", title: "成本", desc: "按年查看并新建价目" },
  { href: "/users", title: "用户管理", desc: "只读查看后台账号" },
];

export default function HomePage() {
  return (
    <>
      <h1 className="page-title">本地台账</h1>
      <p className="page-desc">
        日常处理订单、客户和年份价目。登录与报表尚未开放。
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
