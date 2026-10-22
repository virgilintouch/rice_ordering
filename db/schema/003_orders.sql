-- 003_orders.sql
-- 大米订购系统 - 订单（含收货快照与价格快照）
-- 日期: 2026-10-22
-- 适配 PostgreSQL 12+
-- 执行方式: ./scripts/apply-migration.sh db/schema/003_orders.sql
--
-- 一行 = 一笔订单。下单时抄入收件人/电话/地址，以及当时的售价与成本。
-- 状态：ordered → paid → shipped → delivered。暂无 cancelled。
-- 毛利不入库，用价格快照计算。

BEGIN;

CREATE TABLE orders (
  id                      BIGSERIAL       PRIMARY KEY,
  order_no                VARCHAR(32)     NOT NULL UNIQUE,
  customer_id             BIGINT          NOT NULL
                          REFERENCES customers(id) ON DELETE RESTRICT,
  address_id              BIGINT          NOT NULL
                          REFERENCES customer_addresses(id) ON DELETE RESTRICT,
  price_year              SMALLINT        NOT NULL
                          REFERENCES rice_year_prices(year) ON DELETE RESTRICT,

  recipient_name          TEXT            NOT NULL,
  recipient_phone         TEXT            NOT NULL,
  address                 TEXT            NOT NULL,

  price_tier              VARCHAR(32)     NOT NULL,
  pack_count              INTEGER         NOT NULL CHECK (pack_count > 0),
  jin_per_pack            INTEGER         NOT NULL CHECK (jin_per_pack > 0),

  unit_price_per_jin      NUMERIC(10,2)   NOT NULL CHECK (unit_price_per_jin > 0),
  rice_cost_per_jin       NUMERIC(10,2)   NOT NULL CHECK (rice_cost_per_jin > 0),
  shipping_fee_per_jin    NUMERIC(10,2)   NOT NULL CHECK (shipping_fee_per_jin > 0),
  vacuum_fee_per_jin      NUMERIC(10,2)   NOT NULL CHECK (vacuum_fee_per_jin >= 0),
  amount                  NUMERIC(12,2)   NOT NULL CHECK (amount > 0),

  status                  VARCHAR(16)     NOT NULL DEFAULT 'ordered',
  ordered_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  paid_at                 TIMESTAMPTZ,
  shipped_at              TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  note                    TEXT,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT orders_price_tier_check
    CHECK (price_tier IN (
      'retail_plain',
      'retail_vacuum',
      'vip_plain',
      'vip_vacuum'
    )),
  CONSTRAINT orders_status_check
    CHECK (status IN ('ordered', 'paid', 'shipped', 'delivered'))
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_ordered_at ON orders(ordered_at);

COMMENT ON TABLE orders IS '订单：关联客户与地址，收货文字与价格做快照。毛利查询时计算。';
COMMENT ON COLUMN orders.order_no IS '订单号，唯一';
COMMENT ON COLUMN orders.customer_id IS '客户档案 FK';
COMMENT ON COLUMN orders.address_id IS '来源地址簿 FK；展示以收货快照为准';
COMMENT ON COLUMN orders.price_year IS '所用年份价目 FK';
COMMENT ON COLUMN orders.recipient_name IS '收件人快照';
COMMENT ON COLUMN orders.recipient_phone IS '电话快照';
COMMENT ON COLUMN orders.address IS '地址文字快照';
COMMENT ON COLUMN orders.price_tier IS '四档售价：retail_plain / retail_vacuum / vip_plain / vip_vacuum';
COMMENT ON COLUMN orders.pack_count IS '包数';
COMMENT ON COLUMN orders.jin_per_pack IS '每包斤数快照';
COMMENT ON COLUMN orders.unit_price_per_jin IS '选用售价，元/市斤';
COMMENT ON COLUMN orders.rice_cost_per_jin IS '成本快照，元/市斤';
COMMENT ON COLUMN orders.shipping_fee_per_jin IS '运费快照，元/市斤';
COMMENT ON COLUMN orders.vacuum_fee_per_jin IS '真空费快照，元/市斤；普通包装记 0';
COMMENT ON COLUMN orders.amount IS '订单金额 = 单价 × 每包斤数 × 包数';
COMMENT ON COLUMN orders.status IS 'ordered / paid / shipped / delivered';

COMMIT;
