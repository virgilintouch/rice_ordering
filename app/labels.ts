/** Display labels only. Stored values stay in English. */

export const ORDER_STATUS_LABEL: Record<string, string> = {
  ordered: "已下单",
  paid: "已付款",
  shipped: "已发货",
  delivered: "已签收",
};

export const ACCOUNT_STATUS_LABEL: Record<string, string> = {
  active: "启用",
  disabled: "停用",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "管理员",
  pricing: "定价员",
  user: "系统用户",
};

export const PRICE_TIER_LABEL: Record<string, string> = {
  retail_plain: "零售普通",
  retail_vacuum: "零售真空",
  vip_plain: "VIP 普通",
  vip_vacuum: "VIP 真空",
};

export function labelOf(map: Record<string, string>, key: string): string {
  return map[key] ?? key;
}
