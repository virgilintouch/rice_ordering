-- 004_app_users.sql
-- 大米订购系统 - 后台系统用户
-- 日期: 2026-10-22
-- 适配 PostgreSQL 12+
-- 执行方式: ./scripts/apply-migration.sh db/schema/004_app_users.sql
--
-- 一行 = 一个可登录后台的账号。与买米客户 customers 分开。
-- 密码只存哈希，不存明文。

BEGIN;

CREATE TABLE app_users (
  id              BIGSERIAL       PRIMARY KEY,
  username        VARCHAR(64)     NOT NULL UNIQUE,
  password_hash   TEXT            NOT NULL,
  display_name    VARCHAR(64)     NOT NULL,
  role            VARCHAR(16)     NOT NULL,
  status          VARCHAR(16)     NOT NULL DEFAULT 'active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT app_users_role_check
    CHECK (role IN ('admin', 'operator')),
  CONSTRAINT app_users_status_check
    CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX idx_app_users_status ON app_users(status);

COMMENT ON TABLE app_users IS '后台系统用户：登录账号，与客户档案 customers 分开';
COMMENT ON COLUMN app_users.username IS '登录用户名，唯一';
COMMENT ON COLUMN app_users.password_hash IS '密码哈希，禁止存明文';
COMMENT ON COLUMN app_users.display_name IS '界面显示名';
COMMENT ON COLUMN app_users.role IS 'admin / operator';
COMMENT ON COLUMN app_users.status IS 'active / disabled';
COMMENT ON COLUMN app_users.last_login_at IS '最近登录时间，可空';

COMMIT;
