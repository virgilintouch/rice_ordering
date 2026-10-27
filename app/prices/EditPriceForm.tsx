"use client";

import { useActionState } from "react";
import { updatePriceYearAction, type ActionState } from "@/app/prices/actions";
import { LIMITS } from "@/lib/limits";

const initial: ActionState = { ok: false, message: "" };

export type EditPriceValues = {
  year: number;
  batch: string;
  riceCostPerJin: string;
  shippingFeePerJin: string;
  vacuumFeePerJin: string;
  retailPlainPerJin: string;
  retailVacuumPerJin: string;
  vipPlainPerJin: string;
  vipVacuumPerJin: string;
  jinPerPack: number;
};

export function EditPriceForm({ values }: { values: EditPriceValues }) {
  const [state, action, pending] = useActionState(updatePriceYearAction, initial);

  return (
    <form className="write-form" action={action}>
      <input type="hidden" name="year" value={values.year} />
      <input type="hidden" name="batch" value={values.batch} />
      <p className="meta">
        年份：{values.year}，批次：{values.batch}。年份与批次是主键，不能改。已有订单仍按下单时快照。
      </p>
      <div className="filters">
        <label>
          大米成本（元/斤）*
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
          运费（元/斤）*
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
          真空费（元/斤）*
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
          零售普通（元/斤）*
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
          零售真空（元/斤）*
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
        <label>
          VIP 普通（元/斤）*
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
          VIP 真空（元/斤）*
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
      </div>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存修改"}
        </button>
        <a className="btn-secondary" href="/prices">
          取消
        </a>
      </div>
      {state.message ? (
        <p className={state.ok ? "ok" : "error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
