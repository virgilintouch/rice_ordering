import Link from "next/link";
import { areasForRole, type NavArea } from "@/lib/access";
import { resolveAuth } from "@/lib/current-user";

const cards: { href: string; title: string; desc: string; area: NavArea }[] = [
  { href: "/orders", title: "订单", desc: "下单、推进状态、打开详情打印", area: "orders" },
  { href: "/customers", title: "客户", desc: "新建、导入、筛选与启停用", area: "customers" },
  { href: "/prices", title: "价目", desc: "查看售价；定价员可维护成本价目", area: "prices" },
  { href: "/reports", title: "毛利分析", desc: "按客户/按年汇总（占位）", area: "reports" },
  { href: "/users", title: "用户管理", desc: "创建定价员与系统用户（管理员）", area: "users" },
];

export default async function HomePage() {
  const auth = await resolveAuth();
  const areas =
    auth.kind === "active" ? new Set(areasForRole(auth.user.role)) : new Set<NavArea>();
  const visible = cards.filter((card) => areas.has(card.area));

  return (
    <>
      <h1 className="page-title">本地台账</h1>
      <p className="page-desc">
        三角色权限：管理员只管账号；定价员只管价目；系统用户处理客户与订单。写入与本页均需登录。请只在本机使用。
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
