import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "./components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "大米订购系统",
  description: "本地自用大米订购台账",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href="/">
              大米订购系统
            </Link>
            <Nav />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
