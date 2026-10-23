"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/orders", label: "订单" },
  { href: "/customers", label: "客户" },
  { href: "/prices", label: "成本" },
  { href: "/users", label: "用户管理" },
];

function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="nav" aria-label="主导航">
      {links.map((link) => (
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
