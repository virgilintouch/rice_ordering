-- 005_app_users_three_roles.sql
-- 大米订购系统 - 三角色权限（admin / pricing / user）
-- 日期: 2026-10-27
-- 执行方式: ./scripts/apply-migration.sh db/schema/005_app_users_three_roles.sql
--
-- 替换旧角色 operator。启用态管理员、定价员各最多一人。
-- 已有 operator → user；多余启用 admin 降为 user（优先保留用户名 admin，否则最小 id）。

BEGIN;

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

UPDATE app_users
SET role = 'user', updated_at = NOW()
WHERE role = 'operator';

-- 若存在多个启用管理员，只留一个
WITH keep AS (
  SELECT id
  FROM app_users
  WHERE role = 'admin' AND status = 'active'
  ORDER BY (username = 'admin') DESC, id ASC
  LIMIT 1
)
UPDATE app_users u
SET role = 'user', updated_at = NOW()
WHERE u.role = 'admin'
  AND u.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM keep k WHERE k.id = u.id);

ALTER TABLE app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('admin', 'pricing', 'user'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_one_active_admin
  ON app_users ((1))
  WHERE role = 'admin' AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_app_users_one_active_pricing
  ON app_users ((1))
  WHERE role = 'pricing' AND status = 'active';

COMMENT ON COLUMN app_users.role IS 'admin / pricing / user（系统用户）';

COMMIT;
