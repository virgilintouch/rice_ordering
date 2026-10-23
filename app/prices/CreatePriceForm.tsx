"use client";

import { useActionState } from "react";
import {
  createPriceYearAction,
  type ActionState,
} from "@/app/prices/actions";
import { LIMITS } from "@/lib/limits";

const initial: ActionState = { ok: false, message: "" };

export function CreatePriceForm({ defaultYear }: { defaultYear: number }) {
  const [state, action, pending] = useActionState(
    createPriceYearAction,
    initial,
  );

  return (
    <form className="write-form" action={action}>
      <h2>新建年份价目</h2>
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
            defaultValue={defaultYear}
          />
        </label>
        <label>
          大米成本（元/斤）*
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
          运费（元/斤）*
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
          真空费（元/斤）*
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
          零售普通（元/斤）*
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
          零售真空（元/斤）*
          <input
            name="retailVacuumPerJin"
            type="number"
            required
            min={0.01}
            max={LIMITS.moneyMax}
            step={0.01}
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
      </div>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存价目"}
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "ok" : "error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
