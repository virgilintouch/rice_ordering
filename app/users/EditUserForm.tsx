"use client";

import { useActionState } from "react";
import { updateStaffUserAction, type ActionState } from "@/app/users/actions";
import { PASSWORD_MAX_LENGTH } from "@/lib/password";

const initial: ActionState = { ok: false, message: "" };

export type EditUserValues = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  status: string;
};

export function EditUserForm({ values }: { values: EditUserValues }) {
  const [state, action, pending] = useActionState(updateStaffUserAction, initial);
  const isAdmin = values.role === "admin";

  return (
    <form className="write-form" action={action}>
      <input type="hidden" name="userId" value={values.id} />
      {isAdmin ? <input type="hidden" name="role" value="admin" /> : null}
      <div className="filters">
        <label>
          用户名 *
          <input
            name="username"
            required
            maxLength={64}
            autoComplete="off"
            defaultValue={values.username}
          />
        </label>
        <label>
          显示名 *
          <input
            name="displayName"
            required
            maxLength={64}
            defaultValue={values.displayName}
          />
        </label>
        <label>
          角色 *
          {isAdmin ? (
            <input readOnly className="readonly-calc" value="管理员" title="管理员角色不可更改" />
          ) : (
            <select name="role" defaultValue={values.role} required>
              <option value="user">系统用户</option>
              <option value="pricing">定价员</option>
            </select>
          )}
        </label>
        <label>
          状态 *
          <select name="status" defaultValue={values.status} required>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </label>
        <label>
          重置密码
          <input
            name="password"
            type="password"
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
            placeholder="留空则不修改"
          />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存修改"}
        </button>
        <a className="btn-secondary" href="/users">
          取消
        </a>
      </div>
      {state.message ? (
        <p className={state.ok ? "ok" : "error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
