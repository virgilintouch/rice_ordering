-- 006_price_batch.sql
-- 大米订购系统 - 价目批次（同年可多行）
-- 日期: 2026-10-27
-- 执行方式: ./scripts/apply-migration.sh db/schema/006_price_batch.sql
--
-- 一行 = 一年 + 一批次（每年从 00 起：00、01、02…）。订单引用 (price_year, price_batch)。
-- 取价/下单时批次必须由用户手动选择，应用层不得自动选用批次。
-- 下单界面批次仅能从 rice_year_prices 已有批次下拉选择，禁止手输。

BEGIN;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_price_year_fkey;

ALTER TABLE rice_year_prices
  ADD COLUMN IF NOT EXISTS batch VARCHAR(2) NOT NULL DEFAULT '00';

UPDATE rice_year_prices SET batch = '00' WHERE batch IS NULL OR batch = '';

ALTER TABLE rice_year_prices
  DROP CONSTRAINT IF EXISTS rice_year_prices_pkey;

ALTER TABLE rice_year_prices
  ADD CONSTRAINT rice_year_prices_pkey PRIMARY KEY (year, batch);

ALTER TABLE rice_year_prices
  DROP CONSTRAINT IF EXISTS rice_year_prices_batch_check;

ALTER TABLE rice_year_prices
  ADD CONSTRAINT rice_year_prices_batch_check
  CHECK (batch ~ '^[0-9]{2}$');

ALTER TABLE rice_year_prices
  ALTER COLUMN batch DROP DEFAULT;

COMMENT ON COLUMN rice_year_prices.batch IS '批次，两位数字字符；每年从 00 起（00、01、02…）。取价须人工选择，禁止自动选用。';
COMMENT ON COLUMN rice_year_prices.year IS '年份；与 batch 组成主键';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS price_batch VARCHAR(2);

UPDATE orders SET price_batch = '00' WHERE price_batch IS NULL;

ALTER TABLE orders
  ALTER COLUMN price_batch SET NOT NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_price_batch_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_price_batch_check
  CHECK (price_batch ~ '^[0-9]{2}$');

ALTER TABLE orders
  ADD CONSTRAINT orders_price_year_batch_fkey
  FOREIGN KEY (price_year, price_batch)
  REFERENCES rice_year_prices (year, batch)
  ON DELETE RESTRICT;

COMMENT ON COLUMN orders.price_batch IS '下单时选用的价目批次快照键；须与 price_year 一起由用户从库中已有批次下拉选择';

COMMIT;
