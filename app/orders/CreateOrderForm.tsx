"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createOrderAction, type ActionState } from "@/app/orders/actions";

export type CustomerOption = { id: number; name: string; code: string };
export type AddressOption = {
  id: number;
  customer_id: number;
  recipient_name: string;
  recipient_phone: string;
  address: string;
};
export type PriceYearOption = {
  year: number;
  rice_cost_per_jin: string;
  jin_per_pack: number;
  retail_plain_per_jin: string;
  retail_vacuum_per_jin: string;
  vip_plain_per_jin: string;
  vip_vacuum_per_jin: string;
};

type PriceTier =
  | "retail_plain"
  | "retail_vacuum"
  | "vip_plain"
  | "vip_vacuum";

const initial: ActionState = { ok: false, message: "" };

const TIER_FIELD: Record<PriceTier, keyof PriceYearOption> = {
  retail_plain: "retail_plain_per_jin",
  retail_vacuum: "retail_vacuum_per_jin",
  vip_plain: "vip_plain_per_jin",
  vip_vacuum: "vip_vacuum_per_jin",
};

function splitKeywords(raw: string): string[] {
  return raw
    .split(/[,，、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchesKeywords(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function money(n: number): string {
  return n.toFixed(2);
}

export function CreateOrderForm({
  customers,
  addresses,
  prices,
}: {
  customers: CustomerOption[];
  addresses: AddressOption[];
  prices: PriceYearOption[];
}) {
  const currentYear = new Date().getFullYear();
  const defaultYear = prices.some((p) => p.year === currentYear)
    ? currentYear
    : (prices[0]?.year ?? currentYear);

  const [codeQuery, setCodeQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [priceYear, setPriceYear] = useState(String(defaultYear));
  const [priceTier, setPriceTier] = useState<PriceTier>("retail_plain");
  const [packCount, setPackCount] = useState("1");
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(createOrderAction, initial);
  const lastResetMessage = useRef("");

  function resetCreateForm() {
    setCodeQuery("");
    setNameQuery("");
    setAppliedCode("");
    setAppliedName("");
    setCustomerId("");
    setAddressId("");
    setPriceYear(String(defaultYear));
    setPriceTier("retail_plain");
    setPackCount("1");
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    if (!state.ok || !state.message) return;
    if (state.message === lastResetMessage.current) return;
    lastResetMessage.current = state.message;
    resetCreateForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on new success message
  }, [state.ok, state.message]);

  const filteredCustomers = useMemo(() => {
    const codeKws = splitKeywords(appliedCode);
    const nameKws = splitKeywords(appliedName);
    if (codeKws.length === 0 && nameKws.length === 0) return [];

    return customers.filter((c) => {
      const codeOk =
        codeKws.length === 0 || matchesKeywords(c.code, codeKws);
      const nameOk =
        nameKws.length === 0 || matchesKeywords(c.name, nameKws);
      return codeOk && nameOk;
    });
  }, [customers, appliedCode, appliedName]);

  useEffect(() => {
    if (!customerId) return;
    if (!filteredCustomers.some((c) => String(c.id) === customerId)) {
      setCustomerId("");
      setAddressId("");
    }
  }, [filteredCustomers, customerId]);

  const filteredAddresses = useMemo(
    () => addresses.filter((a) => String(a.customer_id) === customerId),
    [addresses, customerId],
  );

  useEffect(() => {
    if (filteredAddresses.length === 0) {
      setAddressId("");
      return;
    }
    if (!filteredAddresses.some((a) => String(a.id) === addressId)) {
      setAddressId(String(filteredAddresses[0].id));
    }
  }, [filteredAddresses, addressId]);

  const selectedCustomer = filteredCustomers.find(
    (c) => String(c.id) === customerId,
  );

  const selectedPrice = prices.find((p) => String(p.year) === priceYear);

  const unitPrice = selectedPrice
    ? Number(selectedPrice[TIER_FIELD[priceTier]])
    : 0;
  const jinPerPack = selectedPrice ? Number(selectedPrice.jin_per_pack) : 0;
  const packs = Math.max(0, Number(packCount) || 0);
  const total = unitPrice * jinPerPack * packs;

  function applyFilter() {
    setAppliedCode(codeQuery.trim());
    setAppliedName(nameQuery.trim());
    setCustomerId("");
    setAddressId("");
  }

  if (customers.length === 0 || prices.length === 0) {
    return (
      <p className="empty">
        下单前请先有启用客户与至少一年价目（可在「客户」「成本」维护）。
      </p>
    );
  }

  const canSubmit =
    Boolean(customerId) &&
    Boolean(addressId) &&
    filteredAddresses.length > 0 &&
    !pending;

  return (
    <div className="write-form">
      <h2>新建订单</h2>

      <div className="order-step">
        <h3>1. 筛选客户</h3>
        <div className="filters">
          <label>
            客户编号
            <input
              value={codeQuery}
              onChange={(e) => setCodeQuery(e.target.value)}
              placeholder="支持模糊，如 C0001"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilter();
                }
              }}
            />
          </label>
          <label>
            客户姓名
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="支持模糊或多词，如 王，张"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFilter();
                }
              }}
            />
          </label>
          <div className="actions">
            <button type="button" onClick={() => applyFilter()}>
              筛选客户
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setCodeQuery("");
                setNameQuery("");
                setAppliedCode("");
                setAppliedName("");
                setCustomerId("");
                setAddressId("");
              }}
            >
              清空
            </button>
          </div>
        </div>

        {appliedCode === "" && appliedName === "" ? (
          <p className="meta">请先输入客户编号和/或客户姓名，再点「筛选客户」。</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="empty">没有匹配的启用客户，请调整筛选条件。</p>
        ) : (
          <div className="pick-list">
            <p className="meta">匹配 {filteredCustomers.length} 位客户，请选择：</p>
            <ul>
              {filteredCustomers.map((c) => (
                <li key={c.id}>
                  <label className="pick-item">
                    <input
                      type="radio"
                      name="pickCustomer"
                      checked={customerId === String(c.id)}
                      onChange={() => {
                        setCustomerId(String(c.id));
                        setAddressId("");
                      }}
                    />
                    <span>
                      <strong>{c.code}</strong> {c.name}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form key={formKey} action={action}>
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="addressId" value={addressId} />

        <div className="order-step">
          <h3>2. 收货地址</h3>
          {!selectedCustomer ? (
            <p className="meta">请先在上方选定客户。</p>
          ) : filteredAddresses.length === 0 ? (
            <p className="empty">该客户暂无有效地址，请先在客户模块维护。</p>
          ) : (
            <>
              <p className="meta">
                当前客户：{selectedCustomer.code} {selectedCustomer.name}
              </p>
              <div className="pick-list">
                <ul>
                  {filteredAddresses.map((a) => (
                    <li key={a.id}>
                      <label className="pick-item">
                        <input
                          type="radio"
                          name="pickAddress"
                          checked={addressId === String(a.id)}
                          onChange={() => setAddressId(String(a.id))}
                        />
                        <span>
                          <strong>{a.recipient_name}</strong>
                          <br />
                          电话：{a.recipient_phone}
                          <br />
                          地址：{a.address}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="order-step">
          <h3>3. 价档与数量</h3>
          <div className="filters">
            <label>
              价目年 *
              <select
                name="priceYear"
                required
                value={priceYear}
                onChange={(e) => setPriceYear(e.target.value)}
              >
                {prices.map((p) => (
                  <option key={p.year} value={p.year}>
                    {p.year}
                    {p.year === currentYear ? "（今年）" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              价档 *
              <select
                name="priceTier"
                required
                value={priceTier}
                onChange={(e) => setPriceTier(e.target.value as PriceTier)}
              >
                <option value="retail_plain">普通包装零售</option>
                <option value="retail_vacuum">真空包装零售</option>
                <option value="vip_plain">普通包装 VIP</option>
                <option value="vip_vacuum">真空包装 VIP</option>
              </select>
            </label>
            <label>
              单价（元/斤）
              <input
                readOnly
                tabIndex={-1}
                className="readonly-calc"
                value={selectedPrice ? money(unitPrice) : "—"}
                title="由所选价目年与价档从价目表自动带出"
              />
            </label>
            <label>
              包数 *
              <input
                name="packCount"
                type="number"
                min={1}
                step={1}
                required
                value={packCount}
                onChange={(e) => setPackCount(e.target.value)}
              />
            </label>
            <label>
              总价（元）
              <input
                readOnly
                tabIndex={-1}
                className="readonly-calc"
                value={selectedPrice && packs > 0 ? money(total) : "—"}
                title={`单价 ${money(unitPrice)} × ${jinPerPack} 斤/包 × ${packs || 0} 包`}
              />
            </label>
            <label>
              备注
              <input name="note" />
            </label>
          </div>
          {selectedPrice ? (
            <p className="meta">
              单价 {money(unitPrice)} 元/斤（价目表）× {jinPerPack} 斤/包 ×{" "}
              {packs || 0} 包 = 总价 {money(total)} 元
            </p>
          ) : null}
        </div>

        <div className="actions">
          <button type="submit" disabled={!canSubmit}>
            {pending ? "提交中…" : "创建订单"}
          </button>
        </div>
        {state.message ? (
          <p className={state.ok ? "meta" : "error"}>{state.message}</p>
        ) : null}
      </form>
    </div>
  );
}
