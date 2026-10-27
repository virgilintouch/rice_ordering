"use client";

import { useActionState, useRef } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const initial: LoginState = { ok: false, message: "" };

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);
  const forgotDialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <form className="write-form login-panel panel" action={action}>
        <h2>后台账号</h2>
        <input type="hidden" name="next" value={next} />
        <label>
          用户名
          <input
            name="username"
            autoComplete="username"
            required
            maxLength={64}
            autoFocus
          />
        </label>
        <label>
          密码
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
          />
        </label>
        {state.message ? <p className="error">{state.message}</p> : null}
        <div className="actions">
          <button type="submit" disabled={pending}>
            {pending ? "登录中…" : "登录"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => forgotDialogRef.current?.showModal()}
          >
            忘记密码
          </button>
        </div>
      </form>
      <dialog ref={forgotDialogRef} className="login-forgot-dialog">
        <p>请联系管理员重置密码</p>
        <form method="dialog" className="actions">
          <button type="submit">关闭</button>
        </form>
      </dialog>
    </>
  );
}
