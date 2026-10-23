#!/usr/bin/env bash
# 应用数据库迁移
# 用法: ./scripts/apply-migration.sh <path-to-sql-file>
#
# 适配本机 PostgreSQL 18 EDB 安装:
#   - psql 在 /Library/PostgreSQL/18/bin/
#   - pg_hba.conf 已改为 trust (仅本机连接免密码；不要对局域网开放 trust)
#   - 不需要 sudo, 以当前用户跑 psql, 通过 -U postgres 走 trust 认证
#   - 走 unix socket (socket 在 /tmp/.s.PGSQL.5432)
set -euo pipefail

PG_BIN="${PG_BIN:-/Library/PostgreSQL/18/bin}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-rice_ordering}"

SQL_FILE="${1:-}"
if [ -z "$SQL_FILE" ] || [ ! -f "$SQL_FILE" ]; then
  echo "用法: $0 <path-to-sql-file>"
  exit 1
fi

if [ ! -x "$PG_BIN/psql" ]; then
  echo "找不到 psql: $PG_BIN/psql"
  echo "可设置环境变量 PG_BIN 指向实际路径"
  exit 1
fi

echo "Applying $SQL_FILE to database '$PG_DB' (as $PG_USER, unix socket) ..."
"$PG_BIN/psql" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  -h /tmp \
  -v ON_ERROR_STOP=1 \
  -f "$SQL_FILE"

echo "Done."
