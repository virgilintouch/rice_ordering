import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/LoginForm";
import { resolveAuth } from "@/lib/current-user";
import { safeNextPath, sessionSecretError } from "@/lib/session-policy";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await resolveAuth();
  if (auth.kind === "active") redirect("/");

  const sp = await searchParams;
  const next = safeNextPath(one(sp.next)) ?? "";
  const secretMissing = sessionSecretError(process.env.SESSION_SECRET ?? "") !== null;

  return (
    <>
      <h1 className="page-title">登录</h1>
      <p className="page-desc">
        使用后台账号登录。买米客户档案不能用来登录。停用账号无法登录。
      </p>
      {secretMissing ? (
        <p className="error">
          会话密钥未配置。请在 .env.local 设置 SESSION_SECRET（至少 32
          位随机字符串）后重启。
        </p>
      ) : null}
      <LoginForm next={next} />
    </>
  );
}
