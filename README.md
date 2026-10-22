# 大米订购系统

本地自用的大米订购台账，基于 PostgreSQL + Web。

## 当前状态

- **已建表并验证（含 DBeaver）**：3 张（`customers`、`customer_addresses`、`rice_year_prices`）
- **待设计**：1 张（`orders`）
- **业务代码**：暂未开始
- **最新进度**：见 [docs/PROGRESS.md](docs/PROGRESS.md)
- **DBeaver 连接与浏览**：见 [docs/dbeaver-guide.md](docs/dbeaver-guide.md)

## 项目结构

```
大米订购系统/
├── README.md                          # 你正在读
├── LICENSE                            # MIT
├── .gitignore
├── .env.example                       # 环境变量示例（不放真实值）
├── docs/
│   ├── PROGRESS.md                    # 进度日志
│   ├── dbeaver-guide.md               # DBeaver 连接与浏览指南
│   ├── specs/                         # 已定稿表的设计 spec
│   └── decisions/                     # 架构决策记录 (ADR)
├── db/
│   ├── README.md                      # 数据库连接与迁移说明
│   └── schema/                        # 迁移脚本
├── sample-data/                       # 脱敏样本数据（非真实客户）
└── scripts/                           # 运维脚本
```

## 数据模型摘要

### customers（已建表，DBeaver 可视化验证）

详细见 [docs/specs/2026-10-13-customers-and-addresses.md](docs/specs/2026-10-13-customers-and-addresses.md)。

| 字段 | 类型 | 关键约束 |
|---|---|---|
| id | BIGSERIAL | PK |
| code | VARCHAR(16) | UNIQUE, NOT NULL |
| name | VARCHAR(64) | UNIQUE, NOT NULL |
| source | TEXT | NOT NULL, 自由输入 |
| status | VARCHAR(16) | CHECK IN ('active','disabled') |
| created_at, updated_at, deleted_at | TIMESTAMPTZ | |

### customer_addresses（已建表，DBeaver 可视化验证）

| 字段 | 类型 | 关键约束 |
|---|---|---|
| id | BIGSERIAL | PK |
| customer_id | BIGINT | FK → customers(id), ON DELETE RESTRICT |
| recipient_name, recipient_phone, address | TEXT | NOT NULL |
| label | TEXT | 可选 |
| is_default, is_active | BOOLEAN | NOT NULL |

### rice_year_prices（已建表，DBeaver 已核对 2026 年测试行）

详细见 [docs/specs/2026-10-14-rice-year-prices.md](docs/specs/2026-10-14-rice-year-prices.md)。运费和真空费在本表内，不另建表。毛利不入库。

口径：

- `year` 是 `SMALLINT`。PostgreSQL 和 DBeaver 显示为 `int2`（2 字节整数，足够存放年份）。
- 金额单位是元/市斤。四个售价都已含运费；两个真空售价另含真空包装费。
- 按包销售。订单金额 = 所选售价 × `jin_per_pack` × 包数。
- 毛利查询时计算。普通包装 = 售价 − 成本 − 运费；真空包装再减真空包装费。
- 九个字段都可按年单独修改，全部 `NOT NULL`，数值必须大于 0。
- 已写入 2026 年测试行：成本 3.50、运费 1.20、真空费 0.50、售价 8.50 / 9.00 / 7.50 / 8.00、每包 10 斤。这行不在迁移脚本里。

| 字段 | 类型 | 关键约束 |
|---|---|---|
| year | SMALLINT | PK |
| rice_cost_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| shipping_fee_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| vacuum_fee_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| retail_plain_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| retail_vacuum_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| vip_plain_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| vip_vacuum_per_jin | NUMERIC(10,2) | NOT NULL, CHECK > 0 |
| jin_per_pack | INTEGER | NOT NULL, CHECK > 0 |

## 给后续 AI 工具的接力说明

1. **从下一张表继续**：`orders`（订单，含价格快照）。`rice_year_prices` 已建表。不要再设计 `shipping_rates`、`vacuum_rates`。
2. **已建表的不要重做**。除非用户明确说要改。
3. **新表的设计流程**：
   - 在对话中与用户对齐字段
   - 写迁移脚本到 `db/schema/00N_xxx.sql`（编号递增）
   - 写 spec 到 `docs/specs/YYYY-MM-DD-xxx.md`
   - 更新本 README 的 `数据模型` 小节和 [docs/PROGRESS.md](docs/PROGRESS.md)
4. **遇到关键架构决策**（如重构、推翻已有方案），先写 ADR 到 `docs/decisions/`，再动代码。

## 待办

- [x] `customers` 设计 + 建表 + 验证（含 DBeaver）
- [x] `customer_addresses` 设计 + 建表 + 验证（含 DBeaver）
- [x] DBeaver 连接指南
- [ ] 从 Excel 导入 35 行客户数据
- [x] `rice_year_prices` 设计定稿、建表，并在 DBeaver 核对 2026 年测试行与毛利
- [x] 运费、真空费并入 `rice_year_prices`，不再单独建表
- [ ] `orders` 订单（含价格快照）
- [ ] Web 前端
- [ ] Web 后端
- [ ] 数据导入工具自动化

## 数据库

参见 [db/README.md](db/README.md) 和 [docs/PROGRESS.md](docs/PROGRESS.md) 的 `环境配置` 段。
DBeaver 客户端连接与可视化：见 [docs/dbeaver-guide.md](docs/dbeaver-guide.md)。
