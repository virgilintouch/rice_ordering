# ADR 0005: 本地 Web 采用 Next.js 单体应用

**状态**：已接受
**日期**：2026-10-24

## 背景

数据库五张表已齐。需要本地管理后台：订单、客户、成本/价目、用户管理。页面要能连库筛选并展示数据。

## 决定

使用 **Next.js（App Router）** 单体应用：

- 页面与 API 同仓
- 本机 `localhost:3721`
- 用 `pg` 连接现有 PostgreSQL `rice_ordering`
- 第一期：导航 + 四页只读列表与筛选 + 健康检查
- 登录拦截、写操作、复杂报表后续再做

## 后果

### 正面

- 一个进程、一套环境变量，本地启动简单
- 后续加登录与 Server Actions / Route Handlers 有现成挂载点

### 负面

- 需安装 Node.js 与依赖；本机要有 npm

## 替代方案

- Express + HTML 模板：更直观但对后续交互扩展较弱
- FastAPI + HTML：偏 Python，与现有 Node/`APP_PORT` 习惯不一致
