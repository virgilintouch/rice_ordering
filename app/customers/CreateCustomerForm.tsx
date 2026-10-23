"use client";

import { useActionState } from "react";
import {
  createCustomerAction,
  type ActionState,
} from "@/app/customers/actions";

const initial: ActionState = { ok: false, message: "" };

export function CreateCustomerForm() {
  const [state, action, pending] = useActionState(createCustomerAction, initial);

  return (
    <form className="write-form" action={action}>
      <h2>新建客户</h2>
      <div className="filters">
        <label>
          姓名 *
          <input name="name" required maxLength={64} />
        </label>
        <label>
          来源 *
          <input name="source" required />
        </label>
        <label>
          备注
          <input name="note" />
        </label>
        <label>
          收件人 *
          <input name="recipientName" required />
        </label>
        <label>
          电话 *
          <input name="recipientPhone" required />
        </label>
        <label>
          地址标签
          <input name="label" />
        </label>
      </div>
      <label className="full">
        地址 *
        <textarea name="address" required rows={2} />
      </label>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存客户"}
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "meta" : "error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
