-- 001_customers_and_addresses.sql
-- 大米订购系统 - 客户档案 + 收货地址簿
-- 适配 PostgreSQL 12+
-- 执行方式: psql -U <user> -d <dbname> -f db/schema/001_customers_and_addresses.sql

BEGIN;

-- ============================================================
-- customers: 客户档案
-- 一行 = 一个客户 (以 name 全局唯一)
-- 业务键: name 唯一; code 是稳定对外编号
-- ============================================================
CREATE TABLE customers (
  id            BIGSERIAL    PRIMARY KEY,
  code          VARCHAR(16)  NOT NULL UNIQUE,
  name          VARCHAR(64)  NOT NULL UNIQUE,
  source        TEXT         NOT NULL,
  note          TEXT,
  status        VARCHAR(16)  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT customers_status_check
    CHECK (status IN ('active','disabled'))
);

CREATE INDEX idx_customers_source
  ON customers(source)
  WHERE deleted_at IS NULL;


-- ============================================================
-- customer_addresses: 收货地址簿
-- 一行 = 一个 (客户, 收货人, 地址) 组合
-- 允许同一客户下挂多行; 不与任何其他字段做联合唯一
-- ============================================================
CREATE TABLE customer_addresses (
  id                BIGSERIAL    PRIMARY KEY,
  customer_id       BIGINT       NOT NULL
                    REFERENCES customers(id) ON DELETE RESTRICT,
  recipient_name    TEXT         NOT NULL,
  recipient_phone   TEXT         NOT NULL,
  address           TEXT         NOT NULL,
  label             TEXT,
  is_default        BOOLEAN      NOT NULL DEFAULT false,
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_customer
  ON customer_addresses(customer_id);


COMMIT;
