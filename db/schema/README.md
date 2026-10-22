# 迁移脚本

## 命名规范

`NNN_<snake_case>.sql`，编号严格递增，3 位补零。

- `001_customers_and_addresses.sql`
- `002_rice_year_prices.sql`（含运费、真空费、四档售价；不另建运费表、真空费表）
- `003_orders.sql`
- `004_app_users.sql`（后台登录账号；与 customers 分开）

## 规则

1. **不可修改已应用的迁移**。一旦在生产环境跑过，即使发现错也只能写新迁移修正。
2. **每个迁移用 `BEGIN; ... COMMIT;` 包裹**，原子化。
3. **带时间戳和注释**，说明这版在做什么。
4. **不要在迁移里写 DML 之外的逻辑**（如 `INSERT` 种子数据）。种子数据放 `db/seeds/`（暂未启用）。
5. **跨表结构变动**用 expand-and-contract：先新增列/表，不删旧的，应用层切换后下一版再删。
