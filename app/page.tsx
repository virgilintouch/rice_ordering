import Link from "next/link";
import { resolveAuth } from "@/lib/current-user";

const cards: { href: string; title: string; desc: string; adminOnly?: boolean }[] = [
  { href: "/orders", title: "订单", desc: "下单、推进状态、打开详情打印" },
  { href: "/customers", title: "客户", desc: "新建、导入、筛选与启停用" },
  { href: "/prices", title: "成本", desc: "按年查看、新建和修改价目" },
  { href: "/users", title: "用户管理", desc: "新建和修改后台账号（管理员）", adminOnly: true },
];

export default async function HomePage() {
  const auth = await resolveAuth();
  const showUsers = auth.kind === "active" && auth.user.role === "admin";
  const visible = cards.filter((card) => showUsers || !card.adminOnly);

  return (
    <>
      <h1 className="page-title">本地台账</h1>
      <p className="page-desc">
        日常处理订单、客户和年份价目。写入和本页都需要登录。用户管理仅管理员可改，且不含密码哈希。请只在本机使用。
      </p>
      <div className="home-grid">
        {visible.map((card) => (
          <Link key={card.href} className="home-card" href={card.href}>
            <strong>{card.title}</strong>
            <span>{card.desc}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
