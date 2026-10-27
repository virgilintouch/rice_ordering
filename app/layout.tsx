import type { Metadata } from "next";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { logoutAction } from "@/app/login/actions";
import { resolveAuth } from "@/lib/current-user";
import { isNextRedirect, logServerError, publicErrorMessage } from "@/lib/public-error";
import { areasForRole } from "@/lib/access";
import { Nav } from "./components/Nav";
import { labelOf, ROLE_LABEL } from "./labels";
import "./globals.css";

export const metadata: Metadata = {
  title: "大米订购系统",
  description: "本地自用大米订购台账",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  let auth: Awaited<ReturnType<typeof resolveAuth>> | { kind: "error"; message: string };
  try {
    auth = await resolveAuth();
  } catch (error) {
    unstable_rethrow(error);
    if (isNextRedirect(error)) throw error;
    logServerError("layout auth", error);
    auth = {
      kind: "error",
      message: publicErrorMessage(error, "登录状态暂时无法确认"),
    };
  }

  if (auth.kind === "reject") redirect("/api/session/end");

  const user = auth.kind === "active" ? auth.user : null;

  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <Link className="brand" href={user ? "/" : "/login"}>
              大米订购系统
            </Link>
            {user ? <Nav areas={areasForRole(user.role)} /> : null}
            {user ? (
              <div className="session-bar">
                <span className="session-name">{user.displayName}</span>
                <span>{labelOf(ROLE_LABEL, user.role)}</span>
                <form action={logoutAction}>
                  <button type="submit">退出</button>
                </form>
              </div>
            ) : auth.kind === "error" ? (
              <form action={logoutAction}>
                <button type="submit">退出</button>
              </form>
            ) : null}
          </div>
        </header>
        <main>
          {auth.kind === "error" ? <p className="error">{auth.message}</p> : children}
        </main>
      </body>
    </html>
  );
}
