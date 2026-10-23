# Spec: 客户 / 订单写入与客户批量导入

**定稿日期**：2026-10-24
**前置**：Web 骨干 `docs/specs/2026-10-24-web-skeleton.md`

## 目标

在现有只读列表上，支持客户与订单的本地写入，以及按 Excel/CSV 批量导入客户与地址。

## 范围

### 做

**客户**
- 新建客户 + 同时一条收货地址；`code` 自动生成（`C` + 4 位补零，取现有最大号 + 1）
- 列表可将 `status` 改为 `active` / `disabled`
- 批量导入：`.xlsx` / `.csv`，表头 `姓名 | 来源 | 收件人 | 电话 | 地址`
  - 姓名已存在：在该客户下追加地址
  - 姓名不存在：新建客户（`source` 取该行来源，`status=active`）+ 地址
  - 结果页：成功 / 跳过 / 失败及原因

**订单**
- 新建：选客户 → 选地址 → 选 `price_year`、`price_tier`、`pack_count`
  - 服务端抄收货快照与价目快照；普通包装 `vacuum_fee_per_jin=0`
  - `amount = unit_price × jin_per_pack × pack_count`
  - `order_no` 自动：`O` + `YYYYMMDD` + `-` + 当日 4 位序号
  - 初始 `status=ordered`
- 状态只向前：`ordered → paid → shipped → delivered`（推进时写对应 `*_at`）

### 不做

登录、改姓名/地址正文、删订单、价目 CRUD、复杂报表、物理删客户

## 技术约定

- Next.js Server Actions 或 Route Handlers；参数化 SQL；事务包裹「客户+地址」与「下单快照」
- 导入解析：xlsx 用轻量库（如 `xlsx`）；CSV 用简单解析；单次上限例如 500 行
- 仍不返回 / 不写入无关的 `password_hash`

## 验收

1. 可新建客户并在列表看到；可切换状态
2. 导入样例五行结构文件有结果汇总，同名追加地址
3. 可对已有客户/价目下单，金额与快照正确；可推进状态
4. 失败时页面有可读错误，库不留下半截事务
