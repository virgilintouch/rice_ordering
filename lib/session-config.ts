import type { SessionOptions } from "iron-session";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  cookieIsSecure,
  sessionSecretError,
} from "@/lib/session-policy";

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET ?? "";
  if (sessionSecretError(password)) {
    throw new Error("会话密钥未配置");
  }
  return {
    cookieName: SESSION_COOKIE_NAME,
    password,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: cookieIsSecure(process.env.NODE_ENV, process.env.SESSION_COOKIE_SECURE),
      sameSite: "lax",
      path: "/",
    },
    onUnsealError(reason) {
      if (reason === "expired") return;
      console.error("[session] rejected cookie:", reason);
    },
  };
}
