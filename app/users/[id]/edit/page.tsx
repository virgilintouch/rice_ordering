import Link from "next/link";
import { notFound } from "next/navigation";
import { EditUserForm } from "@/app/users/EditUserForm";
import { resolveAuth } from "@/lib/current-user";
import { query } from "@/lib/db";
import { parseId } from "@/lib/input";
import { logServerError } from "@/lib/public-error";
import { LOGIN_REQUIRED_MESSAGE } from "@/lib/session-policy";

type UserRow = {
  id: string | number;
  username: string;
  display_name: string;
  role: string;
  status: string;
};

function dbId(value: string | number): number | null {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await resolveAuth();
  if (auth.kind !== "active") {
    return (
      <>
        <h1 className="page-title">修改账号</h1>
        <p className="error">{LOGIN_REQUIRED_MESSAGE}</p>
      </>
    );
  }
  if (auth.user.role !== "admin") {
    return (
      <>
        <h1 className="page-title">修改账号</h1>
        <p className="error">无权查看用户管理。</p>
      </>
    );
  }

  const { id: idRaw } = await params;
  const userId = parseId(idRaw);
  if (userId == null) notFound();

  let row: UserRow | undefined;
  try {
    const rows = await query<UserRow>(
      `SELECT id, username, display_name, role, status
       FROM app_users
       WHERE id = $1`,
      [userId],
    );
    row = rows[0];
  } catch (error) {
    logServerError("editUser", error);
    return (
      <>
        <h1 className="page-title">修改账号</h1>
        <p className="error">加载失败</p>
      </>
    );
  }
  const id = row ? dbId(row.id) : null;
  if (!row || id == null) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">修改账号</h1>
          <p className="page-desc">可改用户名、显示名、角色和启停。密码留空则保持原哈希。</p>
        </div>
        <Link className="btn-secondary" href="/users">
          返回用户
        </Link>
      </div>
      <div className="panel">
        <EditUserForm
          values={{
            id,
            username: row.username,
            displayName: row.display_name,
            role: row.role,
            status: row.status,
          }}
        />
      </div>
    </>
  );
}
