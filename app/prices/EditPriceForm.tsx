"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  nextPriceBatchForYearAction,
  updatePriceYearAction,
  type ActionState,
} from "@/app/prices/actions";
import { LIMITS } from "@/lib/limits";

const initial: ActionState = { ok: false, message: "" };

export type EditPriceValues = {
  year: number;
  sourceBatch: string;
  riceCostPerJin: string;
  shippingFeePerJin: string;
  vacuumFeePerJin: string;
  retailPlainPerJin: string;
  retailVacuumPerJin: string;
  vipPlainPerJin: string;
  vipVacuumPerJin: string;
  jinPerPack: number;
  costNote: string;
};

export function EditPriceForm({ values }: { values: EditPriceValues }) {
  const [state, action, pending] = useActionState(updatePriceYearAction, initial);
  const [previewBatch, setPreviewBatch] = useState("");
  const fetchGen = useRef(0);

  useEffect(() => {
    const gen = ++fetchGen.current;
    void nextPriceBatchForYearAction(String(values.year)).then((batch) => {
      if (gen !== fetchGen.current) return;
      setPreviewBatch(batch);
    });
  }, [values.year]);

  // Revision always creates a new batch (>00 once any row exists), so note is required.
  const noteRequired = Boolean(previewBatch && previewBatch !== "00");

  return (
    <form className="write-form price-form" action={action}>
      <input type="hidden" name="year" value={values.year} />
      <input type="hidden" name="sourceBatch" value={values.sourceBatch} />
      <p className="meta">
        基于批次 {values.sourceBatch} 修改会新增批次（不覆盖、不删除旧行）。新批次由系统自动生成。
        备注在新批次非 00 时必填。已有订单仍按下单时快照。
      </p>
      <div className="filters">
        <label>
          年份
          <input
            value={values.year}
            readOnly
            tabIndex={-1}
            className="readonly-calc"
          />
        </label>
        <label>
          批次（新）
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
            defaultValue={values.jinPerPack}
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
            defaultValue={values.riceCostPerJin}
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
            defaultValue={values.shippingFeePerJin}
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
            defaultValue={values.vacuumFeePerJin}
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
            defaultValue={values.retailPlainPerJin}
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
            defaultValue={values.retailVacuumPerJin}
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
            defaultValue={values.vipPlainPerJin}
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
            defaultValue={values.vipVacuumPerJin}
          />
        </label>
        <span className="price-form-spacer" aria-hidden="true" />

        <label>
          {noteRequired ? "备注 *" : "备注"}
          <input
            name="costNote"
            maxLength={LIMITS.costNote}
            required={noteRequired}
            defaultValue={values.costNote}
            autoComplete="off"
            placeholder={noteRequired ? "必填" : "批次 00 可留空"}
          />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存为新批次"}
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
