# Cursor 接力 — rice_ordering（2026-10-27 Asia/Shanghai）

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
