"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createPriceYearAction,
  nextPriceBatchForYearAction,
  type ActionState,
} from "@/app/prices/actions";
import { LIMITS } from "@/lib/limits";

const initial: ActionState = { ok: false, message: "" };

export function CreatePriceForm() {
  const [state, action, pending] = useActionState(
    createPriceYearAction,
    initial,
  );
  const [year, setYear] = useState("");
  const [previewBatch, setPreviewBatch] = useState("");
  const fetchGen = useRef(0);

  useEffect(() => {
    if (!/^\d{4}$/.test(year)) {
      setPreviewBatch("");
      return;
    }
    const gen = ++fetchGen.current;
    void nextPriceBatchForYearAction(year).then((batch) => {
      if (gen !== fetchGen.current) return;
      setPreviewBatch(batch);
    });
  }, [year]);

  const noteRequired = Boolean(previewBatch && previewBatch !== "00");

  return (
    <form className="write-form price-form" action={action}>
      <h2>新建年份价目</h2>
      <p className="meta">
        价目只增不删。批次从 00 起由系统自动递增，不可手改。修改已有价目会再生成新批次。备注在批次
        00 时可空，其后必填。
      </p>
      <div className="filters">
        <label>
          年份 *
          <input
            name="year"
            type="number"
            required
            min={2000}
            max={2100}
            step={1}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder=""
            autoComplete="off"
          />
        </label>
        <label>
          批次
          <input
            value={previewBatch || "—"}
            readOnly
            tabIndex={-1}
            className="readonly-calc"
            title="由系统按年自动生成，不可编辑"
            aria-readonly="true"
          />
        </label>
        <label>
          每包斤数 *
          <input
            name="jinPerPack"
            type="number"
            required
            min={1}
            max={LIMITS.jinPerPackMax}
            step={1}
            defaultValue={10}
          />
        </label>

        <label>
          大米成本 *
          <input
            name="riceCostPerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>
        <label>
          运费 *
          <input
            name="shippingFeePerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>
        <label>
          真空费 *
          <input
            name="vacuumFeePerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>

        <label>
          普通零售价 *
          <input
            name="retailPlainPerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>
        <label>
          普通真空零售价 *
          <input
            name="retailVacuumPerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>
        <span className="price-form-spacer" aria-hidden="true" />

        <label>
          VIP零售价 *
          <input
            name="vipPlainPerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>
        <label>
          VIP真空零售价 *
          <input
            name="vipVacuumPerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
          />
        </label>
        <span className="price-form-spacer" aria-hidden="true" />

        <label>
          {noteRequired ? "备注 *" : "备注"}
          <input
            name="costNote"
            maxLength={LIMITS.costNote}
            required={noteRequired}
            autoComplete="off"
            placeholder={noteRequired ? "必填" : "批次 00 可留空"}
          />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存价目"}
        </button>
        <a className="btn-secondary" href="/prices">
          返回
        </a>
      </div>
      {state.message && !state.ok ? (
        <p className="error">{state.message}</p>
      ) : null}
    </form>
  );
}
