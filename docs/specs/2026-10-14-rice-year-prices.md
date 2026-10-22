# Spec: 年份价格

**定稿日期**：2026-10-14
**对应迁移**：`db/schema/002_rice_year_prices.sql`
**架构决策**：`docs/decisions/0002-yearly-price-table.md`

## 背景

用户按年维护大米的成本、运费、真空包装费和四档售价。销售时每包固定斤数，按包卖。毛利由这些数字算出，不单独存。

## 业务上下文

- 计价单位是市斤。金额用 `NUMERIC(10,2)`，单位元/市斤。
- 四个售价都已含运费。两个真空售价另含真空包装费。
- 下单金额 = 所选售价 × `jin_per_pack` × 包数。运费和真空费不再往订单金额上加一遍。
- 九个字段都可以按年单独修改。某一年真空售价不恰好等于普通售价加真空费时，仍按手填的售价保存。
- 一行代表一个年份。改价覆盖该年这一行；历史订单以后用价格快照，不回写本表。

## 表设计

### rice_year_prices

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| year | SMALLINT | PK | 年份。PostgreSQL 内部类型名是 `int2` |
| rice_cost_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 大米成本，元/市斤 |
| shipping_fee_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 运费，元/市斤 |
| vacuum_fee_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 真空包装费，元/市斤 |
| retail_plain_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 普通包装零售价，已含运费 |
| retail_vacuum_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 真空包装零售价，已含运费和真空费 |
| vip_plain_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 普通包装 VIP 价，已含运费 |
| vip_vacuum_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 | 真空包装 VIP 价，已含运费和真空费 |
| jin_per_pack | INTEGER | NOT NULL, CHECK > 0 | 每包斤数 |

本表没有 `created_at` / `updated_at`。业务字段就是这 9 列。

## 计算

毛利不建列。普通包装扣除成本和运费，真空包装再扣真空包装费。

```sql
SELECT
  year,
  retail_plain_per_jin - rice_cost_per_jin - shipping_fee_per_jin
    AS retail_plain_margin_per_jin,
  retail_vacuum_per_jin - rice_cost_per_jin - shipping_fee_per_jin - vacuum_fee_per_jin
    AS retail_vacuum_margin_per_jin,
  vip_plain_per_jin - rice_cost_per_jin - shipping_fee_per_jin
    AS vip_plain_margin_per_jin,
  vip_vacuum_per_jin - rice_cost_per_jin - shipping_fee_per_jin - vacuum_fee_per_jin
    AS vip_vacuum_margin_per_jin
FROM rice_year_prices
WHERE year = 2026;
```

一包毛利 = 每斤毛利 × `jin_per_pack`。

## 2026 年示例

下列数字用来核对口径，不写入迁移脚本。

| 字段 | 值 |
|---|---|
| year | 2026 |
| rice_cost_per_jin | 3.50 |
| shipping_fee_per_jin | 1.20 |
| vacuum_fee_per_jin | 0.50 |
| retail_plain_per_jin | 8.50 |
| retail_vacuum_per_jin | 9.00 |
| vip_plain_per_jin | 7.50 |
| vip_vacuum_per_jin | 8.00 |
| jin_per_pack | 10 |

按上式，零售两种包装的每斤毛利都是 3.80 元，VIP 两种都是 2.80 元。一包毛利分别是 38.00 元和 28.00 元。

## 关键决策

1. **一年一行，年份做主键。**
2. **九个字段都持久化**，售价不由成本、运费、真空费推导。
3. **运费和真空费并入本表**，不建 `shipping_rates`、`vacuum_rates`。
4. **毛利只在查询时计算。**

## 拒绝的替代方案

| 方案 | 拒绝理由 |
|---|---|
| 只存成本、运费、真空费、普通零售价和 VIP 下浮，其余售价用公式生成 | 某一年的售价关系一旦变化就写不进去 |
| 运费、真空费各自一张规则表 | 当前两者都是每年一个元/市斤数字，和米价同一粒度 |
| 把毛利存成列 | 用户要求由售价和成本计算，避免和手填售价不一致 |
