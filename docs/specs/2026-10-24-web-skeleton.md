# Spec: Web 骨干（Next.js）

**定稿日期**：2026-10-24
**架构决策**：`docs/decisions/0005-nextjs-web.md`

## 目标

本地自用管理后台骨架：能启动、能连库、四个板块能筛选并只读展示数据。

## 范围

### 本期做

1. Next.js（App Router）项目骨架，端口 `3721`
2. `lib/db.ts`：用环境变量连接 `rice_ordering`
3. 顶栏导航：订单 / 客户 / 成本 / 用户管理
4. 四个只读列表页 + 筛选
5. `GET /api/health`：应用状态 + 数据库连通性
6. 更新 `.env.example`、README、PROGRESS

### 本期不做

- 登录 / 会话拦截
- 创建、修改、删除
- 复杂报表与统计看板
- 生产部署、Docker

## 页面与筛选

| 路由 | 数据源 | 展示 | 筛选 |
|---|---|---|---|
| `/orders` | `orders`（可 JOIN 客户名） | 订单号、客户、价档、包数、金额、状态、下单时间 | 状态、客户名（模糊）、下单日期起止 |
| `/customers` | `customers` + 地址数或地址摘要 | 编号、姓名、来源、状态 | 来源、状态、姓名（模糊） |
| `/prices` | `rice_year_prices` | 年份、成本、运费、真空费、四档售价、每包斤数 | 年份（精确或空=全部） |
| `/users` | `app_users` | 用户名、显示名、角色、状态、最近登录 | 角色、状态 |

`app_users.password_hash` **永不返回前端**。

## 技术约定

- 框架：Next.js App Router + TypeScript
- 样式：简单全局 CSS，够用即可（非视觉精修）
- 数据库：`pg` + 连接池；查询用参数化 SQL，禁止拼接用户输入
- 环境变量：`DB_HOST`、`DB_PORT`、`DB_NAME`、`DB_USER`、`DB_PASSWORD`、`APP_PORT`（默认 `3721`）
- 列表默认按时间或主键倒序，条数上限例如 200，避免一次拉全表过大

## 目录（预期）

```
大米订购系统/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # 首页跳转或简要说明
│   ├── orders/page.tsx
│   ├── customers/page.tsx
│   ├── prices/page.tsx
│   ├── users/page.tsx
│   ├── api/health/route.ts
│   └── globals.css
├── lib/
│   └── db.ts
├── package.json
├── tsconfig.json
├── next.config.ts
├── .env.example
├── db/ …
└── docs/ …
```

## 验收

1. `npm install && npm run dev` 可在本机打开
2. `/api/health` 在数据库可达时返回成功
3. 四个页面能打开；无筛选时显示现有数据（可为空表）
4. 筛选条件生效；错误时有可读提示，不暴露栈轨迹给页面

## 后续（不在本期）

- 登录（`app_users`）
- 各板块 CRUD
- 下单事务（抄收货与价格快照）
- 复杂报表
