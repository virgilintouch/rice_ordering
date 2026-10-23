import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type UserRow = {
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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const role = one(sp.role).trim();
  const status = one(sp.status).trim();

  const where: string[] = [];
  const params: unknown[] = [];

  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  // password_hash intentionally omitted
  const sql = `
    SELECT
      username,
      display_name,
      role,
      status,
      last_login_at,
      created_at
    FROM app_users
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY id
    LIMIT 200
  `;

  let rows: UserRow[] = [];
  let error: string | null = null;
  try {
    rows = await query<UserRow>(sql, params);
  } catch (e) {
    error = e instanceof Error ? e.message : "查询失败";
  }

  return (
    <>
      <h1 className="page-title">用户管理</h1>
      <p className="page-desc">只读列表。不展示密码哈希。按角色、状态筛选。</p>

      <div className="panel">
        <form className="filters" method="get">
          <label>
            角色
            <select name="role" defaultValue={role}>
              <option value="">全部</option>
              <option value="admin">admin</option>
              <option value="operator">operator</option>
            </select>
          </label>
          <label>
            状态
            <select name="status" defaultValue={status}>
              <option value="">全部</option>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </label>
          <div className="actions">
            <button type="submit">筛选</button>
            <a href="/users">清空</a>
          </div>
        </form>

        {error ? <p className="error">{error}</p> : null}
        {!error && rows.length === 0 ? (
          <p className="empty">暂无后台用户。</p>
        ) : null}
        {!error && rows.length > 0 ? (
          <>
            <p className="meta">共 {rows.length} 条</p>
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
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.username}>
                      <td>{row.username}</td>
                      <td>{row.display_name}</td>
                      <td>{row.role}</td>
                      <td>{row.status}</td>
                      <td>
                        {row.last_login_at
                          ? new Date(row.last_login_at).toLocaleString("zh-CN")
                          : "—"}
                      </td>
                      <td>{new Date(row.created_at).toLocaleString("zh-CN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
