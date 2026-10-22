# Spec: 客户档案与收货地址簿

**定稿日期**：2026-10-13
**对应迁移**：`db/schema/001_customers_and_addresses.sql`

## 背景

用户需要一个本地自用的大米订购台账。客户信息管理是基础模块之一。

## 业务上下文

- 用户在拼多多（PDD）、ISACA、私域（"王"= 用户本人 / "郑"= 用户太太）四个渠道经营客户
- 同一客户可能在多个渠道有订单，但目前不需要合并跨渠道同名客户
- 同一客户名下常有多个收货人 / 多个地址 / 不同电话
- 收件人字段不强制为真实姓名（昵称、代收点名称都可）
- 地址独立，无跨字段校验

## 数据样本

脱敏样本见 `sample-data/customers-sample.xlsx`（35 行，虚构姓名/电话/地址，保留渠道与多地址结构）。Excel 列：`姓名 | 来源 | 收件人 | 电话 | 地址`。

## 表设计

### customers

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGSERIAL | PK | 自增主键 |
| code | VARCHAR(16) | UNIQUE, NOT NULL | 客户编号，格式 C000 起 4 位补零 |
| name | VARCHAR(64) | UNIQUE, NOT NULL | 客户姓名，全局唯一（区分大小写） |
| source | TEXT | NOT NULL | 来源标签，自由输入（无 CHECK） |
| note | TEXT | — | 备注 |
| status | VARCHAR(16) | NOT NULL, DEFAULT 'active' | active / disabled |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| deleted_at | TIMESTAMPTZ | NULL | 软删除标记 |

索引：
- `code` 唯一索引（自动）
- `name` 唯一索引（自动）
- `idx_customers_source` 部分索引：`(source) WHERE deleted_at IS NULL`

### customer_addresses

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | BIGSERIAL | PK | |
| customer_id | BIGINT | NOT NULL, FK → customers(id), ON DELETE RESTRICT | |
| recipient_name | TEXT | NOT NULL | 收件人姓名（含昵称/称谓） |
| recipient_phone | TEXT | NOT NULL | 收件人电话 |
| address | TEXT | NOT NULL | 完整地址 |
| label | TEXT | — | 可选标签（自家/工作/父母家） |
| is_default | BOOLEAN | NOT NULL, DEFAULT false | 是否默认收货地址 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | |

索引：
- `idx_addresses_customer`：`(customer_id)`

## 关键决策

1. **客户档案与地址簿分层**：`customers` 是"人"，`customer_addresses` 是"发货场景"。一个客户可挂多行地址。
2. **`name` 全局唯一**（区分大小写）：用作业务键，不依赖 source 联合。
3. **不强制 `customers.phone`**：Excel 5 列结构不含此字段。营销时如需主联系电话，由应用层从 `customer_addresses.recipient_phone` 派生。
4. **`source` 自由输入**：业务标签，不参与去重；建索引支持按渠道检索。
5. **软删除 + `ON DELETE RESTRICT`**：客户下还有地址时禁止物理删除。
6. **金额用 `NUMERIC`、时间用 `TIMESTAMPTZ`**：避免浮点和时区问题（未来订单表同样适用）。

## 查询样例

### 按客户名列出所有收货地址

```sql
SELECT
  c.code, c.name, c.source,
  a.recipient_name, a.recipient_phone, a.address, a.label
FROM customers c
JOIN customer_addresses a ON a.customer_id = c.id
WHERE c.name = '满毅'
  AND c.deleted_at IS NULL
  AND a.is_active = true;
```

### 按来源列出所有活跃客户

```sql
SELECT * FROM customers
WHERE source = 'PDD'
  AND deleted_at IS NULL
ORDER BY code;
```

## 拒绝的替代方案

| 方案 | 拒绝理由 |
|---|---|
| 单表扁平模型（每行 = 一个发货场景） | 失去"客户档案"概念，无法做客户维度聚合 |
| `(name, source)` 联合唯一 | source 是分组标签，同渠道内 name 已唯一；联合唯一是过度约束 |
| `citext`（不区分大小写） | 用户接受 `Jessica` 和 `jessica` 算两人；本地台账合并流程一年碰不到一次 |
| 收件人"是否已核实"标志 | 字段是长文字，不做脏数据治理 |
| `customers.phone` 主联系 | 不在 Excel 5 列结构内；本地自用暂不需要 |
