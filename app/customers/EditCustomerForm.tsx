"use client";

import { useActionState } from "react";
import {
  updateCustomerAction,
  type ActionState,
} from "@/app/customers/actions";
import { LIMITS } from "@/lib/limits";

const initial: ActionState = { ok: false, message: "" };

export type EditCustomerValues = {
  customerId: number;
  addressId: number;
  code: string;
  name: string;
  source: string;
  note: string;
  status: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  label: string;
};

export function EditCustomerForm({ values }: { values: EditCustomerValues }) {
  const [state, action, pending] = useActionState(updateCustomerAction, initial);

  return (
    <form className="write-form" action={action}>
      <input type="hidden" name="customerId" value={values.customerId} />
      <input type="hidden" name="addressId" value={values.addressId} />
      <p className="meta">客户编号：{values.code}</p>
      <div className="filters">
        <label>
          客户姓名 *
          <input
            name="name"
            required
            maxLength={LIMITS.customerName}
            defaultValue={values.name}
          />
        </label>
        <label>
          来源 *
          <input
            name="source"
            required
            maxLength={LIMITS.source}
            defaultValue={values.source}
          />
        </label>
        <label>
          状态
          <select name="status" defaultValue={values.status}>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </label>
        <label>
          备注
          <input name="note" maxLength={LIMITS.note} defaultValue={values.note} />
        </label>
        <label>
          收件人 *
          <input
            name="recipientName"
            required
            maxLength={LIMITS.recipientName}
            defaultValue={values.recipientName}
          />
        </label>
        <label>
          电话 *
          <input
            name="recipientPhone"
            required
            maxLength={LIMITS.recipientPhone}
            defaultValue={values.recipientPhone}
          />
        </label>
        <label>
          地址标签
          <input name="label" maxLength={LIMITS.label} defaultValue={values.label} />
        </label>
      </div>
      <label className="full">
        地址 *
        <textarea
          name="address"
          required
          rows={2}
          maxLength={LIMITS.address}
          defaultValue={values.address}
        />
      </label>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存修改"}
        </button>
        <a className="btn-secondary" href="/customers">
          取消
        </a>
      </div>
      {state.message ? (
        <p className={state.ok ? "ok" : "error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
