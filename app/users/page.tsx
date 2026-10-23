import { query } from "@/lib/db";
import { Badge } from "@/app/components/Badge";
import { formatTime } from "@/app/format";
import { ACCOUNT_STATUS_LABEL, ROLE_LABEL, labelOf } from "@/app/labels";

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
      <p className="page-desc">只读列表。密码不会出现在此页。按角色、状态筛选。</p>

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
              <option value="operator">操作员</option>
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
