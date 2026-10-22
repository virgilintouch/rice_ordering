-- 002_rice_year_prices.sql
-- 大米订购系统 - 年份价格
-- 日期: 2026-10-14
-- 适配 PostgreSQL 12+
-- 执行方式: ./scripts/apply-migration.sh db/schema/002_rice_year_prices.sql
--
-- 一行 = 一个年份。九个业务字段都可独立填写。
-- 售价已含运费；真空售价另含真空包装费。
-- 毛利不入库。不再单独建 shipping_rates / vacuum_rates。

BEGIN;

CREATE TABLE rice_year_prices (
  year                   SMALLINT       PRIMARY KEY,
  rice_cost_per_jin      NUMERIC(10,2)  NOT NULL CHECK (rice_cost_per_jin > 0),
  shipping_fee_per_jin   NUMERIC(10,2)  NOT NULL CHECK (shipping_fee_per_jin > 0),
  vacuum_fee_per_jin     NUMERIC(10,2)  NOT NULL CHECK (vacuum_fee_per_jin > 0),
  retail_plain_per_jin   NUMERIC(10,2)  NOT NULL CHECK (retail_plain_per_jin > 0),
  retail_vacuum_per_jin  NUMERIC(10,2)  NOT NULL CHECK (retail_vacuum_per_jin > 0),
  vip_plain_per_jin      NUMERIC(10,2)  NOT NULL CHECK (vip_plain_per_jin > 0),
  vip_vacuum_per_jin     NUMERIC(10,2)  NOT NULL CHECK (vip_vacuum_per_jin > 0),
  jin_per_pack           INTEGER        NOT NULL CHECK (jin_per_pack > 0)
);

COMMENT ON TABLE rice_year_prices IS '年份价格：成本、运费、真空费、四档售价、每包斤数。毛利查询时计算。';
COMMENT ON COLUMN rice_year_prices.year IS '年份，主键，一年一行';
COMMENT ON COLUMN rice_year_prices.rice_cost_per_jin IS '大米成本，元/市斤';
COMMENT ON COLUMN rice_year_prices.shipping_fee_per_jin IS '运费，元/市斤；已含在四档售价中';
COMMENT ON COLUMN rice_year_prices.vacuum_fee_per_jin IS '真空包装费，元/市斤；已含在两档真空售价中';
COMMENT ON COLUMN rice_year_prices.retail_plain_per_jin IS '普通包装零售价，元/市斤，已含运费';
COMMENT ON COLUMN rice_year_prices.retail_vacuum_per_jin IS '真空包装零售价，元/市斤，已含运费和真空费';
COMMENT ON COLUMN rice_year_prices.vip_plain_per_jin IS '普通包装 VIP 价，元/市斤，已含运费';
COMMENT ON COLUMN rice_year_prices.vip_vacuum_per_jin IS '真空包装 VIP 价，元/市斤，已含运费和真空费';
COMMENT ON COLUMN rice_year_prices.jin_per_pack IS '每包斤数，按包销售';

COMMIT;
