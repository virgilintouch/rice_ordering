# ADR 0006: 后台登录用密封 cookie

**状态**：已接受
**日期**：2026-10-24

## 背景

工作人员页面和写入 Server Action 之前匿名可调用。账号表 `app_users` 已有 `username`、`password_hash`、`role`、`status`。规格要求密码用 bcrypt（或同等算法），登录成功更新 `last_login_at`，停用账号不能登录。

## 决定

不新增用户表，也不上 Auth.js。

- 密码：bcryptjs，cost 10。与其它 bcrypt 实现兼容。没有种子哈希；用 `scripts/set-app-user-password.ts` 创建或重置。
- 会话：iron-session 密封 cookie `rice_session`。HttpOnly，SameSite=Lax，生产环境默认 Secure。绝对过期 12 小时，不随请求顺延。
- 密钥只来自 `SESSION_SECRET`（至少 32 字符）。缺失时无法登录，不使用仓库里的默认密钥。
- 中间件挡住未登录的页面。每个写入 Server Action 再向 `app_users` 确认账号仍是启用的 `admin` 或 `operator`。
- `/users` 只给 `admin`。列表继续不查询 `password_hash`。

## 后果

### 正面

- 会话无服务端存储，不增加表。
- 停用或删除账号后，下一次打开页面或写入会失效，不必等 cookie 自然过期才失去写权限。
- 失败登录不区分「无此用户 / 密码错 / 已停用」。

### 负面

- 本机 `npm run start` 仍是 HTTP。生产模式默认 Secure cookie 时浏览器不会保存，需要 `SESSION_COOKIE_SECURE=false`。
- 12 小时内不查库的只读请求，在账号刚被停用时仍可能看到页面，直到布局里的账号查询把会话清掉。写入不会等到过期。

## 替代方案

### A. Auth.js

- 拒绝理由：要接适配器和回调，比「一个密封 cookie + 现有表」大，这台本机控制台用不上。

### B. 自写 AES cookie

- 拒绝理由：iron-session 已经封装密封、过期和 HttpOnly，不必自己碰加密细节。
