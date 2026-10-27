# 大米订购系统

本地自用的大米订购台账，基于 PostgreSQL + Web。

## 当前状态

- **已建表**：5 张（`customers`、`customer_addresses`、`rice_year_prices`、`orders`、`app_users`）
- **Web**：Next.js 端口 `3721`，默认只监听 `127.0.0.1`；客户 / 订单 / 年份价目可写入（价目可新建和修改）；客户支持 Excel/CSV 批量导入；用户页仅管理员可新建和修改，查询不含 `password_hash`
- **已做**：前端可读性调整。首轮安全加固（本机绑定、写入校验、错误信息不回传数据库原文、基础响应头）之上，已加 `app_users` 登录与会话，以及价目修改和后台账号维护。详见 [docs/PROGRESS.md](docs/PROGRESS.md)
- **尚未做**（优先级）：简单报表
- **最新进度**：见 [docs/PROGRESS.md](docs/PROGRESS.md)
- **DBeaver 连接与浏览**：见 [docs/dbeaver-guide.md](docs/dbeaver-guide.md)

## 本地启动 Web

1. 确认 PostgreSQL 已启动，库名 `rice_ordering`；按 [db/README.md](db/README.md) 执行 `db/schema/` 迁移
2. 复制环境变量：`cp .env.example .env.local`，按需填写（本机 trust 时密码可留空），并设置 `SESSION_SECRET`（至少 32 字符，`openssl rand -base64 32`）。`.env` / `.env.local` 不要入库
3. 安装并启动（只监听本机回环，不对局域网开放）：

```bash
npm install
npm run dev
```

浏览器打开 [http://127.0.0.1:3721](http://127.0.0.1:3721)，会先到登录页。健康检查仍无需登录：[http://127.0.0.1:3721/api/health](http://127.0.0.1:3721/api/health)。

先按下面「登录」设好一个后台账号。`npm run dev` 可直接登录。`npm run start` 也是本机 HTTP，需在 `.env.local` 写 `SESSION_COOKIE_SECURE=false`，否则生产模式会给 cookie 加 Secure，浏览器不会在 HTTP 上保存它。

仍不要对局域网开放。PostgreSQL 保持只监听本机，`trust` 认证不要对局域网开放。登录之后若要改监听地址，需单独决定，本仓库的 dev/start 脚本仍绑定 `127.0.0.1`。

## 登录

账号在 **`app_users`**（没有第二张用户表；页面路由是 `/users`）。密码只存哈希。角色三档：`admin`（管理员，唯一）、`pricing`（定价员，唯一）、`user`（系统用户）；停用（`disabled`）不能登录。

### 怎么设密码

库里没有现成哈希，也没有种子账号。在仓库根目录执行（会读 `.env.local` / `.env`，不打印哈希或密码）：

```bash
node --experimental-strip-types scripts/set-app-user-password.ts <用户名> <密码> [显示名] [admin|pricing|user]
```

- 用户名已存在：只更新 `password_hash` 和 `updated_at`。
- 用户名不存在：新建 `active` 账号。显示名默认等于用户名，角色默认 `user`。启用态 `admin` / `pricing` 各最多一人。
- 示例：`node --experimental-strip-types scripts/set-app-user-password.ts pricing1 '换一个长密码' '定价员' pricing`

然后打开 `/login`，用该用户名和密码登录。顶栏会显示显示名和角色，以及「退出」。

### 密码怎么哈希

- **bcrypt**，实现是 **bcryptjs**（纯 JS，与其它 bcrypt 实现兼容），cost **10**。
- 库存格式 `$2a$10$…` 或 `$2b$10$…`，列 `app_users.password_hash`。
- 密码最长 72 个字符。更长会拒绝，而不是截断后保存。
- 登录成功写入 `last_login_at`。
- 密码错误、用户不存在、账号停用，页面都只显示「用户名或密码不正确」。不回显哈希，也不回显 SQL。

### 会话 cookie

| 项 | 值 |
|---|---|
| 名称 | `rice_session` |
| 内容 | [iron-session](https://github.com/vvo/iron-session) 密封，不是明文 |
| HttpOnly | 是 |
| SameSite | `Lax`（同站表单和 Server Actions 会带上） |
| Secure | `npm run start`（`NODE_ENV=production`）默认是。`npm run dev` 不是。本机 HTTP 跑 start 时设 `SESSION_COOKIE_SECURE=false` |
| 过期 | **绝对 12 小时**，从登录成功起算，操作不会顺延。浏览器 Max-Age 再短 60 秒，避免送出已过期的密封 |
| 密钥 | `SESSION_SECRET`，至少 32 字符。更换后所有人需要重新登录 |

服务只监听 `127.0.0.1`。未登录跳转的主机名是 `localhost`（Next 中间件内部地址）。`localhost` 和 `127.0.0.1` 都在本机，但会话 cookie 只属于登录时地址栏里的那个主机名，不要在两者之间切换。

未登录访问工作人员页面会转到 `/login?next=…`（`next` 只接受站内相对路径）。写入按角色再查库：`admin` 只管用户；`pricing` 维护价目；`user` 维护客户/订单。否则「请先登录」或无权提示，不返回栈或 SQL。`/api/health` 仍公开。

`/users` 只给唯一 `admin`，且不能再创建管理员。`pricing` 维护价目（含成本）。`user` 做客户/订单，价目只读售价（看不到成本列），毛利分析页暂为占位。停用唯一启用管理员/定价员会被拒绝。页面不查询 `password_hash`。

空库时请先在「成本」新建年份价目、在「客户」新建或导入客户，再去「订单」下单。仓库**不含**真实业务数据与 `sample-data/` 样本文件。

| 路径 | 说明 |
|---|---|
| `/orders` | 下单（筛客户 → 单选地址 → 价档/包数）、状态推进、时间戳列表；点订单号新标签打开详情（可打印/关闭） |
| `/orders/[id]` | 订单详情与打印（状态、价档、包数、每包斤数、单价、金额、收货快照、各阶段时间） |
| `/customers` | 新建 / 修改 / 启停用 / 软删、多关键词筛选 |
| `/customers/import` | 批量导入（姓名/来源/收件人/电话/地址） |
| `/prices` | 年份价目列表筛选、按年新建和修改（管理员与操作员） |
| `/prices/[year]/edit` | 修改该年成本、运费、真空费、四档售价、每包斤数 |
| `/login` | 用户名 + 密码登录 |
| `/users` | 后台用户新建 / 修改（仅管理员；不含密码哈希） |
| `/users/[id]/edit` | 修改用户名、显示名、角色、启停；密码可留空 |

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
- 示例数字（成本 3.50、运费 1.20、真空费 0.50、售价 8.50 / 9.00 / 7.50 / 8.00、每包 10 斤）仅用于核对口径，**不在迁移脚本里**，也不随仓库附带。

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
| role | VARCHAR(16) | CHECK IN ('admin','pricing','user')；启用 admin/pricing 各最多一人 |
| status | VARCHAR(16) | CHECK IN ('active','disabled') |
| last_login_at | TIMESTAMPTZ | 可空 |
| created_at, updated_at | TIMESTAMPTZ | |

## 给后续 AI 工具的接力说明

1. **客户 / 订单 / 价目写入与导入已齐，登录已接在 `app_users` 上，价目可改，管理员可维护后台账号**。不要再做第二套用户表。后续优先顺序：简单报表。不要把 Web 或数据库暴露到局域网。不建仓库内脱敏种子（见 PROGRESS）；不做 DBeaver 补看。不要再设计 `shipping_rates`、`vacuum_rates`。不要停用或降级最后一个启用的管理员。页面和接口不要查询或返回 `password_hash`。
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
- [x] 客户 Excel/CSV 批量导入（页面已支持；样本文件不入库）
- [x] `rice_year_prices` 设计定稿、建表，并在 DBeaver 核对毛利口径
- [x] 运费、真空费并入 `rice_year_prices`，不再单独建表
- [x] `orders` 设计定稿并建表（psql 已核对；不安排 DBeaver 补看）
- [x] `app_users` 设计定稿并建表（psql 已核对；不安排 DBeaver 补看）
- [x] Web 骨干（Next.js，端口 3721）
- [x] 客户新建 / 修改 / 启停用 / 软删 / Excel·CSV 导入
- [x] 订单新建（价格快照）/ 状态推进 / 详情打印 / 时间戳
- [x] 年份价目新建
- [x] 脱敏种子检查：现阶段不建仓库内 seed；本机 `sample-data/` 不入库
- [x] 1. 前端界面美化调整（可读性与日常操作，不改业务逻辑）
- [x] 2. 整体代码安全性评估与首轮加固
- [x] 3. 登录（`app_users`，iron-session + bcrypt）
- [x] 4. 价目修改 / 用户写入（价目无删除；最后一个启用管理员不能被停用或降级）
- [ ] 5. 简单报表

## 数据库

参见 [db/README.md](db/README.md) 和 [docs/PROGRESS.md](docs/PROGRESS.md) 的 `环境配置` 段。
DBeaver 客户端连接与可视化：见 [docs/dbeaver-guide.md](docs/dbeaver-guide.md)。
