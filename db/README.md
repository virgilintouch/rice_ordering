# 数据库

本项目使用 PostgreSQL 12+。

## 连接

通过环境变量配置，参见仓库根目录的 `.env.example`。

## 迁移

迁移脚本位于 `db/schema/`，命名规范见 [db/schema/README.md](schema/README.md)。

应用迁移：

```bash
psql -U "$DB_USER" -d "$DB_NAME" -f db/schema/001_customers_and_addresses.sql
```

## 迁移清单

| 编号 | 内容 | 状态 |
|---|---|---|
| 001 | customers + customer_addresses | 已执行（见 [docs/PROGRESS.md](../docs/PROGRESS.md)） |
| 002 | rice_year_prices | 已执行（2026-10-14，DBeaver 已核对测试行） |
| 003 | orders | 已执行（2026-10-22，psql 已核对） |
| 004 | app_users | 已执行（2026-10-22，psql 已核对） |
