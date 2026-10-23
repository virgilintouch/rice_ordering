import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query<{ ok: number; now: Date }>(
      "SELECT 1 AS ok, NOW() AS now",
    );
    return NextResponse.json({
      status: "ok",
      database: "up",
      serverTime: rows[0]?.now ?? null,
      portHint: process.env.APP_PORT || "3721",
    });
  } catch (error) {
    console.error("[health]", error);
    return NextResponse.json(
      {
        status: "error",
        database: "down",
      },
      { status: 503 },
    );
  }
}
