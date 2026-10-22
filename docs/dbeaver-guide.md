# DBeaver 可视化查看指南

适用于本机 PostgreSQL 18 + 本项目数据库 `rice_ordering`。

## 前置条件

- 本机 PostgreSQL 服务已启动（`sudo launchctl kickstart -k system/postgresql-18`）
- `pg_hba.conf` 已改为 `trust`（本地连接免密码，见 [db/README.md](../db/README.md)）
- DBeaver 任意版本（演示用 26.2.0）

## 连接步骤

### 1. 新建连接

DBeaver 工具栏 → `新建数据库连接` 按钮（图标是大象+加号）

或菜单：文件 → 新建 → DBeaver → 数据库连接。

### 2. 选择驱动

在弹出对话框里：

- 搜索框输入 `PostgreSQL`
- 选`标准 PostgreSQL`（第一个图标是大象），`不要选`：
  - `PostgreSQL (Old)` — 老版 JDBC 驱动
  - `Google Cloud SQL - PostgreSQL` — 云服务专用

→ 点`下一步`

### 3. 填连接参数

`主要`标签页：

| 字段 | 值 |
|---|---|
| 连接方式 | 主机 |
| 主机 | localhost |
| 端口 | 5432 |
| 数据库 | `rice_ordering` |
| 身份验证 | Username/password |
| 用户名 | postgres |
| 密码 | （留空） |

`关键点`：

- `数据库`字段默认是 `postgres`，必须改成 `rice_ordering`
- 密码留空是因为 `pg_hba.conf` 已改为 trust
- `保存密码`复选框保持勾选（DBeaver 26 默认勾上）

→ 点`测试连接`

`首次使用`：DBeaver 会自动下载 PG JDBC 驱动（一次约 1-2 MB），有进度条。等几秒。

期望看到`已连接`绿色对勾。

→ 点`完成`

### 4. 浏览表

左侧`连接`标签里出现 `rice_ordering localhost:5432`。

展开它：

```
rice_ordering
  └─ 模式
      └─ public
          └─ 表           ← 展开这里
              ├─ customer_addresses
              ├─ customers
              └─ rice_year_prices
```

#### 4a. 看表结构（DDL）

右键 `customers` → 在弹出菜单里：

- `查看 SQL` → 显示该表的完整 CREATE TABLE
- `编辑表` → 表结构编辑器

#### 4b. 看数据

右键 `customers` → `查看数据`

或点中表后，按 `F4` 快捷键。

#### 4c. 跑 SQL

工具栏 `SQL` 按钮（图标是 SQL 文件加号）→ 新建 SQL 控制台

输入：

```sql
SELECT c.code, c.name, c.source, a.recipient_name, a.address
FROM customers c
LEFT JOIN customer_addresses a ON a.customer_id = c.id
ORDER BY c.code;
```

按 `Ctrl+Enter` 执行。结果在下方网格显示。

## 常见问题

### 连接测试失败：password authentication failed

`pg_hba.conf` 不是 `trust`。需要：

```bash
sudo cp /Library/PostgreSQL/18/data/pg_hba.conf /Library/PostgreSQL/18/data/pg_hba.conf.bak
sudo sed -i '' '/^local/ s/scram-sha-256/trust/; /^host/ s/scram-sha-256/trust/' /Library/PostgreSQL/18/data/pg_hba.conf
sudo launchctl kickstart -k system/postgresql-18
```

### DBeaver 找 PostgreSQL 驱动失败

网络问题。检查 DBeaver 仓库设置：窗口 → 首选项 → DBeaver → 驱动 → Maven 仓库。

### 看不到表但连接成功

左侧导航树右键数据库名 → `刷新`。

### 想看表数据但右键菜单没`查看数据`

可能是表没被正确识别。重新点击表节点，按 `F4` 强制打开。

## 关键参考

- PostgreSQL 18 服务：[db/README.md](../db/README.md)
- 客户表 spec：[docs/specs/2026-10-13-customers-and-addresses.md](specs/2026-10-13-customers-and-addresses.md)
- 年份价格 spec：[docs/specs/2026-10-14-rice-year-prices.md](specs/2026-10-14-rice-year-prices.md)
- 已执行迁移：[db/schema/001_customers_and_addresses.sql](../db/schema/001_customers_and_addresses.sql)、[db/schema/002_rice_year_prices.sql](../db/schema/002_rice_year_prices.sql)
- 迁移应用脚本：[scripts/apply-migration.sh](../scripts/apply-migration.sh)
