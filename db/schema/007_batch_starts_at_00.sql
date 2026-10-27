-- 007_batch_starts_at_00.sql
-- 大米订购系统 - 每年批次从 00 起编号（00、01、02…）
-- 日期: 2026-10-27
-- 执行方式: ./scripts/apply-migration.sh db/schema/007_batch_starts_at_00.sql
--
-- 006 曾把存量行回填为 01。约定改为每年第一批为 00。
-- 仅当该年尚无 00 时，将 01 改为 00（订单同步改）。

BEGIN;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_price_year_batch_fkey;

UPDATE rice_year_prices AS p
SET batch = '00'
WHERE p.batch = '01'
  AND NOT EXISTS (
    SELECT 1
    FROM rice_year_prices AS x
    WHERE x.year = p.year
      AND x.batch = '00'
  );

UPDATE orders AS o
SET price_batch = '00'
WHERE o.price_batch = '01'
  AND EXISTS (
    SELECT 1
    FROM rice_year_prices AS p
    WHERE p.year = o.price_year
      AND p.batch = '00'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM rice_year_prices AS p
    WHERE p.year = o.price_year
      AND p.batch = '01'
  );

ALTER TABLE orders
  ADD CONSTRAINT orders_price_year_batch_fkey
  FOREIGN KEY (price_year, price_batch)
  REFERENCES rice_year_prices (year, batch)
  ON DELETE RESTRICT;

COMMENT ON COLUMN rice_year_prices.batch IS
  '批次，两位数字字符；每年从 00 起（00、01、02…）。取价须人工从已有批次中选择，禁止自动选用。';
COMMENT ON COLUMN orders.price_batch IS
  '下单时选用的价目批次快照键；须与 price_year 一起由用户从库中已有批次下拉选择';

COMMIT;
