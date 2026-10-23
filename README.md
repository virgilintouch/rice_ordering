# 大米订购系统

本地自用的大米订购台账，基于 PostgreSQL + Web。

## 当前状态

- **已建表**：5 张（`customers`、`customer_addresses`、`rice_year_prices`、`orders`、`app_users`）
- **Web**：Next.js 端口 `3721`；客户/订单可写入；客户支持 Excel/CSV 批量导入；价目与用户仍为只读
- **尚未做**：登录、价目/用户写入、复杂报表
- **最新进度**：见 [docs/PROGRESS.md](docs/PROGRESS.md)
- **DBeaver 连接与浏览**：见 [docs/dbeaver-guide.md](docs/dbeaver-guide.md)

## 本地启动 Web

1. 确认 PostgreSQL 已启动，库名 `rice_ordering`
2. 复制环境变量：`cp .env.example .env.local`，按需填写（本机 trust 时密码可留空）
3. 安装并启动：

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3721](http://localhost:3721)。健康检查：[http://localhost:3721/api/health](http://localhost:3721/api/health)。

| 路径 | 说明 |
|---|---|
| `/orders` | 下单、状态推进、列表筛选 |
| `/customers` | 新建客户、启停用、列表筛选 |
| `/customers/import` | 批量导入（姓名/来源/收件人/电话/地址） |
| `/prices` | 年份价目只读 |
| `/users` | 后台用户只读（不含密码哈希） |

Web 设计见 [docs/specs/2026-10-24-web-skeleton.md](docs/specs/2026-10-24-web-skeleton.md)。

## 项目结构

```
大米订购系统/
├── README.md
├── package.json                       # Next.js 应用
├── app/                               # 页面与 API
├── lib/db.ts                          # PostgreSQL 连接
├── .env.example
├── docs/
├── db/
├── sample-data/                       # 本地样本（gitignore）
└── scripts/
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

### orders（已建表，psql 已核对）

详细见 [docs/specs/2026-10-22-orders.md](docs/specs/2026-10-22-orders.md)。关联客户/地址/价目年；收货文字与价格做快照。状态：`ordered` → `paid` → `shipped` → `delivered`。暂无 `cancelled`。

| 字段 | 类型 | 关键约束 |
|---|---|---|
| id | BIGSERIAL | PK |
| order_no | VARCHAR(32) | UNIQUE, NOT NULL |
| customer_id | BIGINT | FK → customers(id) |
| address_id | BIGINT | FK → customer_addresses(id) |
| price_year | SMALLINT | FK → rice_year_prices(year) |
| recipient_name, recipient_phone, address | TEXT | NOT NULL，收货快照 |
| price_tier | VARCHAR(32) | CHECK 四档 |
| pack_count, jin_per_pack | INTEGER | NOT NULL, CHECK > 0 |
| unit_price / cost / shipping / vacuum / amount | NUMERIC | 价格快照；真空费允许 0 |
| status | VARCHAR(16) | ordered / paid / shipped / delivered |
| ordered_at, paid_at, shipped_at, delivered_at | TIMESTAMPTZ | 后三者可空 |

### app_users（已建表，psql 已核对）

详细见 [docs/specs/2026-10-22-app-users.md](docs/specs/2026-10-22-app-users.md)。后台登录账号，与买米客户 `customers` 分开。密码只存哈希。

| 字段 | 类型 | 关键约束 |
|---|---|---|
| id | BIGSERIAL | PK |
| username | VARCHAR(64) | UNIQUE, NOT NULL |
| password_hash | TEXT | NOT NULL |
| display_name | VARCHAR(64) | NOT NULL |
| role | VARCHAR(16) | CHECK IN ('admin','operator') |
| status | VARCHAR(16) | CHECK IN ('active','disabled') |
| last_login_at | TIMESTAMPTZ | 可空 |
| created_at, updated_at | TIMESTAMPTZ | |

## 给后续 AI 工具的接力说明

1. **客户/订单写入与导入已齐**。下一步可做登录，或价目/用户写入、复杂报表。不要再设计 `shipping_rates`、`vacuum_rates`。
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
- [x] `orders` 设计定稿并建表（psql 已核对）
- [ ] `orders` 的 DBeaver 可视化验证
- [x] `app_users` 设计定稿并建表（psql 已核对）
- [ ] `app_users` 的 DBeaver 可视化验证
- [x] Web 骨干（Next.js，端口 3721）
- [x] 客户新建 / 启停用 / Excel·CSV 导入
- [x] 订单新建（价格快照）/ 状态推进
- [ ] 登录（`app_users`）
- [ ] 价目与用户写入
- [ ] 复杂报表

## 数据库

参见 [db/README.md](db/README.md) 和 [docs/PROGRESS.md](docs/PROGRESS.md) 的 `环境配置` 段。
DBeaver 客户端连接与可视化：见 [docs/dbeaver-guide.md](docs/dbeaver-guide.md)。
