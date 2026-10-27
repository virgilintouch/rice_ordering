"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavArea } from "@/lib/access";

const links: { href: string; label: string; area: NavArea }[] = [
  { href: "/orders", label: "订单", area: "orders" },
  { href: "/customers", label: "客户", area: "customers" },
  { href: "/prices", label: "价目", area: "prices" },
  { href: "/reports", label: "毛利分析", area: "reports" },
  { href: "/users", label: "用户管理", area: "users" },
];

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ areas }: { areas: readonly NavArea[] }) {
  const pathname = usePathname();
  const allowed = new Set(areas);
  const visible = links.filter((link) => allowed.has(link.area));

  return (
    <nav className="nav" aria-label="主导航">
      {visible.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
