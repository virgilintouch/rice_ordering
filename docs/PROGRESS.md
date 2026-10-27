# 项目进度

最后更新：2026-10-27（Asia/Shanghai）

## Cursor 接力（2026-10-27）

> 由 Projects Manager 汇总，供 Cursor 本地跟进。仓库：https://github.com/virgilintouch/rice_ordering  
> 本机路径：`/Users/virgil/Documents/MyProjects/大米订购系统`  
> 备份（跑改动前）：`大米订购系统.bak-20261024-023552`  
> Notion 项目：https://app.notion.com/p/40231040e080818db409dfe85f38279b  
> 协作房：Grok Bot「Virgil Wang、SWE、Lumi」

## 当前 HEAD

- 分支：`main`
- Commit：`ac9fbc5` — Add staff edits for yearly prices and app users (#4)
- 开放 PR：无

## 已合入（均经 Lumi 复测后 squash）

| PR | Commit | 内容 |
|----|--------|------|
| [#1](https://github.com/virgilintouch/rice_ordering/pull/1) | `22f3450` | 前端可读性；订单详情/打印补状态、价档、金额、每包斤数 |
| [#2](https://github.com/virgilintouch/rice_ordering/pull/2) | `6c79a60` | 本机只听 127.0.0.1；写入校验；错误脱敏；安全响应头；`password_hash` 不出页 |
| [#3](https://github.com/virgilintouch/rice_ordering/pull/3) | `15c21a5` | `app_users` 登录（iron-session + bcrypt）；未登录写拦；admin/operator 权限 |
| [#4](https://github.com/virgilintouch/rice_ordering/pull/4) | `ac9fbc5` | 价目修改；管理员用户写入/改密；末个启用管理员不可停用或降级 |

## Notion 任务状态

- Done：前端美化、详情/打印字段、主流程复测、安全加固、登录/鉴权、价目/用户写入
- **Not started（下一项）**：**报表** — 按客户/按年汇总与毛利（等有真实订单数据收益最大）

## 约束（跟进时务必遵守）

1. 改动走**分支 + PR**，不直接动 `main`
2. 本机拉/跑改动前先备份项目目录
3. 服务保持 `127.0.0.1:3721`，不对局域网开放
4. 不要第二套用户表；页面/接口不返回 `password_hash`
5. 不建仓库内脱敏种子；`sample-data/` 不入库
6. Cursor Premium：省 token（少并行、能小改不大改）

## Cursor 建议下一步

实现 **简单报表**（README / docs/PROGRESS 优先级第 5 项）：按客户、按年汇总与毛利；先对齐口径再开分支。细节见仓库内 [docs/PROGRESS.md](docs/PROGRESS.md)「下一步」与 README「给后续 AI 工具的接力说明」。

## 本地启动摘要

`SESSION_SECRET` ≥32；`npm run start` 本机 HTTP 需 `SESSION_COOKIE_SECURE=false`；账号用 `scripts/set-app-user-password.ts` 创建。详见 README「登录」。

## 当前阶段

**订购主流程已可用，并且需要登录**（Next.js `127.0.0.1:3721`，默认不监听局域网）。五张表齐；客户 / 订单 / 年份价目可写入（价目可改，不删除）；管理员可维护后台账号。订单详情可打印。界面可读性调整与首轮安全加固已完成（PR #1–#4 已合入，HEAD `ac9fbc5`）。登录用现有 `app_users`，见下方「登录」。下一项仅为简单报表。

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
- [x] **成本 / 价目**：列表筛选、按年新建和修改（成本/运费/真空费/四档售价/每包斤数）。管理员与操作员都可以改。不删除年份行
- [x] **订单创建**：筛客户 → 地址单选 → 价档与包数；单价/总价只读由价目计算；成功后清空表单防重复提交
- [x] **订单列表**：状态推进（付款→发货→签收）；下单/付款/发货/收货时间戳；签收后操作列显示「订单已完成」（不入库）
- [x] **订单详情**：订单号新标签打开；标题 `订单号-{order_no}`；打印 / 关闭窗口。详情与打印含状态、价档（中文）、金额、每包斤数
- [x] **布局**：内容区加宽；地址列换行，其余列尽量单行
- [x] **可读性（2026-10-23）**：导航当前页、表格表头与斑马行、表单分栏、空态/错误/成功提示；状态、角色、价档显示中文（提交值不变）
- [x] **登录（2026-10-24）**：`/login`、退出、iron-session 密封 cookie、写入与工作人员页面需登录、`/users` 仅管理员。详见下方「登录」与 [docs/decisions/0006-session-login.md](decisions/0006-session-login.md)
- [x] **价目修改 / 用户写入（2026-10-24）**：`/prices/[year]/edit`；`/users` 新建与 `/users/[id]/edit`。密码走 `lib/password.ts` 的 bcrypt。最后一个启用管理员不能被停用或降级。页面不查询 `password_hash`

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

## 登录（2026-10-24）

决定见 [docs/decisions/0006-session-login.md](decisions/0006-session-login.md)。用法见 README「登录」。

- 用户表就是 `app_users`。密码 **bcrypt**（bcryptjs，cost 10）。没有现成哈希时用 `scripts/set-app-user-password.ts` 创建或重置，脚本不打印哈希。
- Cookie `rice_session`：HttpOnly、SameSite=Lax、生产默认 Secure、绝对 12 小时。密钥 `SESSION_SECRET`（至少 32 字符）。
- 未登录页面跳到 `/login`。写入 Server Action 再查库，确认账号仍启用；失败是「请先登录」，不是栈或 SQL。
- 密码错、无此用户、停用账号都是「用户名或密码不正确」。
- `/users` 仅 admin，查询列不含 `password_hash`，渲染前再删一次该字段。
- `/api/health` 仍公开。监听地址仍是 `127.0.0.1`。

### 验证（2026-10-24）

- `npm test`：bcrypt cost 10 可往返；会话绝对 12 小时；登录后跳转只允许站内路径；`/users` 源码的列表列不含 `password_hash`。
- `npm run build` 通过。
- 未登录打开 `/orders` 会到 `/login`。把已登录时的「新建价目」请求去掉 cookie 再发，响应是跳转登录，价目行数不变。
- 密码错误、停用账号都只显示「用户名或密码不正确」。管理员登录后顶栏有显示名和退出；`/users` 的 HTML 不含 `password_hash`。退出后再次打开订单页回到登录页。
- 操作员看不到用户管理菜单；直接打开 `/users` 是「无权查看」，页面不列出账号。
- 登录成功后把该账号停用，再发原来的写入：正文是「请先登录」，没有插入数据，也没有 SQL。
- 会话 cookie 为 HttpOnly、SameSite=Lax。这次用 `next start` 加 `SESSION_COOKIE_SECURE=false`（本机 HTTP），所以 cookie 不是 Secure。

## 价目修改与用户写入（2026-10-24）

价目仍是一年一行，没有启停或删除。管理员和操作员都可以新建、修改。`/users` 仍只给管理员：新建账号、改用户名/显示名/角色/启停、重置密码。密码走 `lib/password.ts`（bcryptjs，cost 10），与 `scripts/set-app-user-password.ts` 相同。停用或降级最后一个 `active` 管理员会被拒绝。页面和写入返回值不带 `password_hash`。

### 验证（2026-10-24）

- `npm test` 通过（含最后一个启用管理员的判断，以及用户页源码不选 `password_hash`）。`STAFF_DB_TEST=1` 时另有一条连库检查：建账号、改价、拒绝停用最后一个管理员、空白密码不改哈希、新密码可校验。
- `npm run build` 通过。
- 操作员能新建并修改 2026 年价目（成本改为 4.00），页面没有删除。直接打开 `/users` 是「无权查看用户管理。」，HTML 不含账号表，也不含 `password_hash`。
- 管理员能创建操作员、重置密码并停用。停用自己（当时唯一的启用管理员）时页面是「不能停用或降级最后一个启用的管理员」，账号仍是启用，登录没有掉。
- 未带 cookie 调用用户写入会跳到登录页，没有插入账号，响应里没有 `password_hash` 或 SQL。

## 安全性（2026-10-23）

评估结论与当时只做了低风险加固；登录在 2026-10-24 补上。报表仍未做。

已确认、本轮未改业务含义的部分：

- SQL 使用 `pg` 参数占位。动态片段只拼固定列名或 `FALSE`，用户值进参数。订单价档列名改为显式四档白名单（避免 `in` 命中对象原型）。
- 页面正文走 React 文本节点，没有 `dangerouslySetInnerHTML`。客户名、地址、导入失败原因按文本输出。
- `app_users` 列表不查询 `password_hash`，渲染前再删掉该字段（防止以后改成 `SELECT *` 时写进 HTML）。
- `.env` / `.env.local` 已在 `.gitignore`。本轮补上 `.env.*`，并保留 `.env.example`。

本轮加固：

- `next dev` / `next start` 绑定 `127.0.0.1`。Next.js 15 默认是 `0.0.0.0`，局域网可直接改客户、订单和价目。
- 写入校验：必填、长度、正整数 id、金额两位小数与上限、包数与每包斤数上限、订单金额不超出 `NUMERIC(12,2)`。
- 筛选：状态/角色白名单，日期与年份格式校验，`ILIKE` 把 `%` `_` `\` 当字面量。
- 数据库错误、连接失败不回传到页面或 `/api/health`。校验失败仍显示中文说明。原始错误只打服务端日志。
- 导入：2MB / 500 行，解析时关闭公式、HTML、宏；SheetJS 已知漏洞见下，未换库。
- 响应头：去掉 `X-Powered-By`，加上 `nosniff`、`Referrer-Policy: same-origin`、`X-Frame-Options: DENY`。Server Actions 请求体上限 2MB。不放宽 `allowedOrigins`（Next 会核对 Origin 与 Host，这是目前的 CSRF 防护，不是登录）。
- 数据库连接设置语句超时，避免一条失控查询占住连接。

留给登录之后（登录已做，下列仍有效）：

- 不在登录这一轮加 CSP。Next 开发脚本需要额外 nonce 配置，容易把本地调试弄坏。
- `xlsx@0.18.5`（SheetJS 社区包）有原型污染与 ReDoS 公告，npm 上没有已修复版本。本轮只缩小解析面。换库或改用官方已修补构建留到导入再动刀时。
- `next@15.5.4` 通过 postcss 带有构建期公告，修复版本是 Next 16，本轮不升级主版本。
- 登录已按当时的约束做：密码只存哈希、会话 cookie 为 HttpOnly + SameSite，失败登录不回显哈希或 SQL。

## 下一步

**后续优先**：

1. ~~**前端界面美化调整**~~ — 已做（2026-10-23）：可读性与空态/错误态，业务逻辑未改  
2. ~~**整体代码安全性评估与首轮加固**~~ — 已做（2026-10-23）：本机绑定、写入校验、错误信息与暴露面  
3. ~~**登录鉴权**~~ — 已做（2026-10-24）：`app_users` + iron-session。仍只监听本机  
4. ~~**价目修改 / 用户写入**~~ — 已做（2026-10-24）：价目可改不可删；管理员可建账号、改资料、重置密码。拒绝停用或降级最后一个启用管理员  
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
- 登录会话：`docs/decisions/0006-session-login.md`
- 客户/订单写入与导入：`docs/specs/2026-10-24-customer-order-writes.md`
