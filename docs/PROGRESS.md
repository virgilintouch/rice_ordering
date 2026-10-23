# 项目进度

最后更新：2026-10-23

## 当前阶段

**订购主流程已可用**（Next.js `localhost:3721`）。五张表齐；客户 / 订单 / 年份价目可写入；订单详情可打印。界面已做可读性调整，业务逻辑未改。

本机库已清空业务数据（订单、客户、地址、价目），便于干净开发与后续导入。`sample-data/` 不入库。

Git：Web 主体已在 `e0d4e96`；本进度与 README 的收工整理随后续文档提交一并推送。

## 已完成

### 表设计与落地

- [x] `customers` 客户档案 — 设计 → spec → SQL → 建表 → DBeaver 可视化验证
- [x] `customer_addresses` 收货地址簿 — 设计 → spec → SQL → 建表 → DBeaver 可视化验证
- [x] `rice_year_prices` 年份价格 — 设计 → ADR → spec → SQL → 建表 → DBeaver 核对毛利口径
- [x] `orders` 订单 — 设计 → ADR → spec → SQL → 建表（psql 已核对；**不再安排** DBeaver 补看）
- [x] `app_users` 后台用户 — 设计 → ADR → spec → SQL → 建表（psql 已核对；**不再安排** DBeaver 补看）

### 工程基础

- [x] 项目结构（README, LICENSE, .gitignore, .env.example）
- [x] 数据库迁移脚本框架（`db/schema/001`–`004`）
- [x] 迁移应用脚本（`scripts/apply-migration.sh`）
- [x] 本机 PostgreSQL 18 服务配置（launchd 启动、pg_hba.conf 改为 trust）
- [x] 文档体系（specs / decisions / PROGRESS / dbeaver-guide）
- [x] Next.js Web 骨干（端口 3721 + `/api/health`）
- [x] GitHub 同步（含 Web；忽略 `sample-data/`、`.env.local`、`node_modules/`、`.next/`）

### Web 功能（2026-10-24）

- [x] **客户**：筛选（多关键词）、新建、修改、启停用、软删、Excel/CSV 导入
- [x] **成本 / 价目**：列表筛选、按年新建（成本/运费/真空费/四档售价/每包斤数）
- [x] **订单创建**：筛客户 → 地址单选 → 价档与包数；单价/总价只读由价目计算；成功后清空表单防重复提交
- [x] **订单列表**：状态推进（付款→发货→签收）；下单/付款/发货/收货时间戳；签收后操作列显示「订单已完成」（不入库）
- [x] **订单详情**：订单号新标签打开；标题 `订单号-{order_no}`；打印 / 关闭窗口
- [x] **布局**：内容区加宽；地址列换行，其余列尽量单行
- [x] **可读性（2026-10-23）**：导航当前页、表格表头与斑马行、表单分栏、空态/错误/成功提示；状态、角色、价档显示中文（提交值不变）

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

## 检查结论（2026-10-24）

### DBeaver 补看结构

- **结论：不做。** `customers` / `customer_addresses` / `rice_year_prices` 已用 DBeaver 核对过；`orders` / `app_users` 以 psql 核对为准，不再单列后续任务。

### 脱敏种子数据

- **库内**：客户 / 地址 / 价目 / 订单 / 用户均为 **0 行**（已主动清空）。
- **仓库**：无 `db/seeds/`；`sample-data/` 仅本机 Excel（含真实感测数据），已 gitignore，**不入库**。
- **结论：现阶段不建仓库内脱敏种子。** clone 后用页面新建价目与客户即可；本机导入继续用本地 `sample-data/` 或自备文件。若日后多人 onboarding 需要「一键示例价目」，再单独做脱敏 seed。

## 下一步

**后续 5 项（按推荐优先级）**：

1. ~~**前端界面美化调整**~~ — 已做（2026-10-23）：可读性与空态/错误态，业务逻辑未改  
2. **整体代码安全性评估与优化** — 现状无登录、页面全开；先评估再按风险加固（校验、Actions、错误信息、暴露面等）  
3. **登录鉴权**（`app_users`）— 接在安全评估之后落地，避免先做登录再大规模返工  
4. **价目修改 / 用户写入** — 补齐价目改价与后台用户维护（目前价目仅新建、用户只读）  
5. **简单报表** — 按客户 / 按年汇总与毛利；等有真实订单数据后再做收益最大  

不建议再拆 `shipping_rates` / `vacuum_rates`。

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
