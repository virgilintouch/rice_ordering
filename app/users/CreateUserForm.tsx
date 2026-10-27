"use client";

import { useActionState } from "react";
import { createStaffUserAction, type ActionState } from "@/app/users/actions";
import { PASSWORD_MAX_LENGTH } from "@/lib/password";

const initial: ActionState = { ok: false, message: "" };

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createStaffUserAction, initial);

  return (
    <form className="write-form" action={action}>
      <h2>新建后台账号</h2>
      <p className="meta">管理员唯一，不可再创建。可创建定价员（全局唯一启用）或系统用户。</p>
      <div className="filters">
        <label>
          用户名 *
          <input name="username" required maxLength={64} autoComplete="off" />
        </label>
        <label>
          显示名 *
          <input name="displayName" required maxLength={64} />
        </label>
        <label>
          角色 *
          <select name="role" defaultValue="user" required>
            <option value="user">系统用户</option>
            <option value="pricing">定价员</option>
          </select>
        </label>
        <label>
          状态 *
          <select name="status" defaultValue="active" required>
            <option value="active">启用</option>
            <option value="disabled">停用</option>
          </select>
        </label>
        <label>
          密码 *
          <input
            name="password"
            type="password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            autoComplete="new-password"
          />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={pending}>
          {pending ? "保存中…" : "创建账号"}
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "ok" : "error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
