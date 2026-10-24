import { unsealData } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  parseSession,
  sessionSecretError,
} from "@/lib/session-policy";

function isPublic(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/api/health" ||
    pathname === "/api/session/end"
  );
}

function noStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return noStore(NextResponse.next());

  const secret = process.env.SESSION_SECRET ?? "";
  let allowed = false;
  if (!sessionSecretError(secret)) {
    const seal = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (seal) {
      try {
        const data = await unsealData(seal, {
          password: secret,
          ttl: SESSION_TTL_SECONDS,
          onUnsealError(reason) {
            if (reason !== "expired") console.error("[session] rejected cookie:", reason);
          },
        });
        allowed = parseSession(data, Date.now()) !== null;
      } catch {
        console.error("[session] unseal failed");
      }
    }
  }

  if (!allowed) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    const next = `${pathname}${request.nextUrl.search}`;
    if (next.startsWith("/") && !next.startsWith("//") && next.length <= 512) {
      login.searchParams.set("next", next);
    }
    return noStore(NextResponse.redirect(login));
  }

  return noStore(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
