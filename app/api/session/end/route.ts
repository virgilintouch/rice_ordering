import { NextResponse } from "next/server";
import { logServerError } from "@/lib/public-error";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Clears a rejected session (disabled or missing account) and returns to login. */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    session.destroy();
  } catch (error) {
    logServerError("session end", error);
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
