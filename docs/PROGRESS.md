# 项目进度

最后更新：2026-10-24

## 当前阶段

Web 已可用：Next.js 端口 3721。客户新建/启停用/批量导入，订单下单（快照）与状态推进已落地。登录、价目/用户写入、报表未做。

## 已完成

### 表设计与落地

- [x] `customers` 客户档案 — 设计 → spec → SQL → 建表 → DBeaver 可视化验证
- [x] `customer_addresses` 收货地址簿 — 设计 → spec → SQL → 建表 → DBeaver 可视化验证
- [x] `rice_year_prices` 年份价格 — 设计 → ADR → spec → SQL → 建表 → DBeaver 核对测试行与毛利
- [x] `orders` 订单 — 设计 → ADR → spec → SQL → 建表（psql 已核对，DBeaver 未看）
- [x] `app_users` 后台用户 — 设计 → ADR → spec → SQL → 建表（psql 已核对，DBeaver 未看）

### 工程基础

- [x] 项目结构（README, LICENSE, .gitignore, .env.example）
- [x] 数据库迁移脚本框架（`db/schema/001_*.sql`）
- [x] 迁移应用脚本（`scripts/apply-migration.sh`）
- [x] 本机 PostgreSQL 18 服务配置（launchd 启动、pg_hba.conf 改为 trust）
- [x] 文档体系（specs / decisions / PROGRESS / dbeaver-guide）
- [x] Next.js Web 骨干（四页列表 + `/api/health`，端口 3721）
- [x] 客户写入与批量导入；订单写入与状态推进

## 验证记录

### 2026-10-13：customers + customer_addresses 建表（psql）

- 迁移脚本：`db/schema/001_customers_and_addresses.sql`
- 工具：`/Library/PostgreSQL/18/bin/psql` via `apply-migration.sh`
- 数据库：`rice_ordering`
- 结果：
  - 2 张表创建成功
  - 6 个索引全部就位（含 1 个部分索引 `idx_customers_source`）
  - 1 个 CHECK 约束（`customers_status_check`）
  - 1 个 FK 约束（`ON DELETE RESTRICT`）

### 2026-10-13：DBeaver 可视化验证

- 工具：DBeaver 26.2.0 + PG JDBC 驱动（首次使用自动下载）
- 连接参数：localhost:5432 / rice_ordering / postgres（trust，密码留空）
- 验证内容：
  - 左侧导航树展开 `rice_ordering > 模式 > public > 表`，两张表都在
  - `customers` 9 列、`customer_addresses` 10 列，类型和约束全部正确
  - 自动展开显示约束、外键、索引、规则、触发器等子节点
- 详细步骤：见 [docs/dbeaver-guide.md](dbeaver-guide.md)

### 2026-10-14：rice_year_prices 建表（psql）

- 迁移脚本：`db/schema/002_rice_year_prices.sql`
- 工具：`/Library/PostgreSQL/18/bin/psql` via `apply-migration.sh`
- 数据库：`rice_ordering`
- 结果：
  - 表创建成功，9 列，类型与说明一致
  - 主键 `rice_year_prices_pkey` 在 `year`
  - 8 个 CHECK 约束（7 个金额列和 `jin_per_pack` 均须大于 0）
  - 9 个 NOT NULL 约束
  - 已写入 2026 年测试行（成本 3.50、运费 1.20、真空费 0.50、四档售价 8.50 / 9.00 / 7.50 / 8.00、每包 10 斤）

### 2026-10-14：rice_year_prices 的 DBeaver 核对

- 工具：DBeaver 26.2.0，连接 `rice_ordering`
- 查询：`SELECT * FROM rice_year_prices WHERE year = 2026`，以及四档每斤毛利
- 结果：测试行与毛利正常。零售每斤毛利 3.80，VIP 每斤毛利 2.80

### 2026-10-22：orders 建表（psql）

- 迁移脚本：`db/schema/003_orders.sql`
- 工具：`/Library/PostgreSQL/18/bin/psql` via `apply-migration.sh`
- 数据库：`rice_ordering`
- 结果：
  - 表创建成功；3 个外键（customers / customer_addresses / rice_year_prices）
  - 状态 CHECK：`ordered` / `paid` / `shipped` / `delivered`
  - 价档 CHECK：四档；真空费允许 `>= 0`
  - 索引：`customer_id`、`status`、`ordered_at` + `order_no` 唯一
  - 当前无数据行

### 2026-10-22：app_users 建表（psql）

- 迁移脚本：`db/schema/004_app_users.sql`
- 工具：`/Library/PostgreSQL/18/bin/psql` via `apply-migration.sh`
- 数据库：`rice_ordering`
- 结果：
  - 表创建成功；`username` 唯一
  - 角色 CHECK：`admin` / `operator`
  - 状态 CHECK：`active` / `disabled`
  - 索引：`idx_app_users_status`
  - 当前无数据行

## 进行中

无。

## 待办

按优先级：

1. 登录（基于 `app_users`）
2. 价目 / 用户写入
3. 复杂报表
4. 在 DBeaver 补看结构（可选）

## 环境配置

### 本机 PostgreSQL 18

- 安装路径：`/Library/PostgreSQL/18/`（EDB 官方安装包）
- 数据目录：`/Library/PostgreSQL/18/data`
- 启动方式：launchd（plist 在 `/Library/LaunchDaemons/postgresql-18.plist`）
- 启动命令：`sudo launchctl kickstart -k system/postgresql-18`
- 客户端：`/Library/PostgreSQL/18/bin/psql` 等
- 认证：`pg_hba.conf` 已改为 trust（仅本地），原文件备份在 `pg_hba.conf.bak`

### 数据库

- 库名：`rice_ordering`
- 用户：`postgres`（本地 trust，无需密码）
- 连接方式：unix socket `/tmp/.s.PGSQL.5432` 或 TCP `localhost:5432`

### 迁移

- 命名规范：`NNN_<snake_case>.sql`，3 位补零
- 应用方式：`./scripts/apply-migration.sh db/schema/00N_xxx.sql`

### GUI 工具

- DBeaver 26.2.0 已验证连接 + 可视化查看
- 详细步骤：见 [docs/dbeaver-guide.md](dbeaver-guide.md)

## 关键决策

- 客户档案 + 收货地址簿分层：`docs/decisions/0001-customer-model.md`
- 详细 spec：`docs/specs/2026-10-13-customers-and-addresses.md`
- 年份价格合成一张表（含运费、真空费、四档售价）：`docs/decisions/0002-yearly-price-table.md`
- 详细 spec：`docs/specs/2026-10-14-rice-year-prices.md`
- 订单关联 + 收货快照 + 价格快照：`docs/decisions/0003-orders-model.md`
- 详细 spec：`docs/specs/2026-10-22-orders.md`
- 后台账号与客户分离：`docs/decisions/0004-app-users.md`
- 详细 spec：`docs/specs/2026-10-22-app-users.md`
- Next.js Web 单体：`docs/decisions/0005-nextjs-web.md`
- Web 骨干 spec：`docs/specs/2026-10-24-web-skeleton.md`
- 客户/订单写入与导入：`docs/specs/2026-10-24-customer-order-writes.md`
