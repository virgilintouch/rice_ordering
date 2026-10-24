"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/orders", label: "订单" },
  { href: "/customers", label: "客户" },
  { href: "/prices", label: "成本" },
  { href: "/users", label: "用户管理", adminOnly: true },
];

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav({ showUsers }: { showUsers: boolean }) {
  const pathname = usePathname();
  const visible = links.filter((link) => showUsers || !link.adminOnly);

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
