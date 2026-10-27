import { query } from "@/lib/db";
import { Badge } from "@/app/components/Badge";
import { formatTime } from "@/app/format";
import { CreateUserForm } from "@/app/users/CreateUserForm";
import { UserRowActions } from "@/app/users/UserRowActions";
import { ACCOUNT_STATUS_LABEL, ROLE_LABEL, labelOf } from "@/app/labels";
import { resolveAuth } from "@/lib/current-user";
import { INVALID_FILTER_MESSAGE } from "@/lib/input";
import { logServerError, publicErrorMessage } from "@/lib/public-error";
import { LOGIN_REQUIRED_MESSAGE } from "@/lib/session-policy";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type UserRow = {
  id: string | number;
  username: string;
  display_name: string;
  role: string;
  status: string;
  last_login_at: Date | null;
  created_at: Date;
};

function one(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

/** Fixed column list. password_hash must never be added. */
const USER_LIST_COLUMNS = [
  "id",
  "username",
  "display_name",
  "role",
  "status",
  "last_login_at",
  "created_at",
] as const;

function presentUsers(rows: UserRow[]): UserRow[] {
  return rows.map((row) => {
    const safe = { ...row };
    delete (safe as { password_hash?: unknown }).password_hash;
    return safe;
  });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const auth = await resolveAuth();
  if (auth.kind !== "active") {
    return (
      <>
        <h1 className="page-title">用户管理</h1>
        <p className="error">{LOGIN_REQUIRED_MESSAGE}</p>
      </>
    );
  }
  if (auth.user.role !== "admin") {
    return (
      <>
        <h1 className="page-title">用户管理</h1>
        <p className="error">无权查看用户管理。</p>
      </>
    );
  }

  const sp = await searchParams;
  const role = one(sp.role).trim();
  const status = one(sp.status).trim();

  const where: string[] = [];
  const params: unknown[] = [];
  let invalidFilter = false;
  const markInvalid = () => {
    invalidFilter = true;
    where.push("FALSE");
  };

  if (role) {
    if (role !== "admin" && role !== "pricing" && role !== "user") markInvalid();
    else {
      params.push(role);
      where.push(`role = $${params.length}`);
    }
  }
  if (status) {
    if (status !== "active" && status !== "disabled") markInvalid();
    else {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
  }

  const sql = `
    SELECT ${USER_LIST_COLUMNS.join(", ")}
    FROM app_users
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY id
    LIMIT 200
  `;

  let rows: UserRow[] = [];
  let error: string | null = null;
  try {
    rows = presentUsers(await query<UserRow>(sql, params));
  } catch (e) {
    logServerError("users list", e);
    error = publicErrorMessage(e, "查询失败");
  }

  return (
    <>
      <h1 className="page-title">用户管理</h1>
      <p className="page-desc">
        仅管理员可新建、修改和删除后台账号。密码只存哈希，此页不显示。管理员账号不可删除；不能停用或降级唯一启用的管理员。
      </p>

      <div className="panel">
        <CreateUserForm />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>后台账号</h2>
          {!error && rows.length > 0 ? (
            <p className="meta">共 {rows.length} 条</p>
          ) : null}
        </div>
        <form className="filters" method="get">
          <label>
            角色
            <select name="role" defaultValue={role}>
              <option value="">全部</option>
              <option value="admin">管理员</option>
              <option value="pricing">定价员</option>
              <option value="user">系统用户</option>
            </select>
          </label>
          <label>
            状态
            <select name="status" defaultValue={status}>
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="disabled">停用</option>
            </select>
          </label>
          <div className="actions">
            <button type="submit">筛选</button>
            <a href="/users">清空</a>
          </div>
        </form>

        {invalidFilter ? <p className="error">{INVALID_FILTER_MESSAGE}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">
            {role || status ? "没有符合筛选条件的账号。" : "暂无后台用户。"}
          </p>
        ) : null}
        {!error && rows.length > 0 ? (
          <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>用户名</th>
                    <th>显示名</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th>最近登录</th>
                    <th>创建时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.username}>
                      <td className="emph">{row.username}</td>
                      <td>{row.display_name}</td>
                      <td>
                        <Badge value={row.role}>{labelOf(ROLE_LABEL, row.role)}</Badge>
                      </td>
                      <td>
                        <Badge value={row.status}>
                          {labelOf(ACCOUNT_STATUS_LABEL, row.status)}
                        </Badge>
                      </td>
                      <td>{formatTime(row.last_login_at)}</td>
                      <td>{formatTime(row.created_at)}</td>
                      <td>
                        <UserRowActions
                          userId={Number(row.id)}
                          username={row.username}
                          role={row.role}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
