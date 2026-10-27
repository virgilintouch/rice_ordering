-- 008_price_cost_note.sql
-- 大米订购系统 - 价目成本备注
-- 日期: 2026-10-27
-- 执行方式: ./scripts/apply-migration.sh db/schema/008_price_cost_note.sql

BEGIN;

ALTER TABLE rice_year_prices
  ADD COLUMN IF NOT EXISTS cost_note VARCHAR(200);

COMMENT ON COLUMN rice_year_prices.cost_note IS '成本备注，可选；按批次填写';

COMMIT;
