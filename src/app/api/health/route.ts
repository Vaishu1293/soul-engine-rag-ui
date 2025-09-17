// app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.BACKEND_URL || "http://localhost:3000";
  try {
    const r = await fetch(`${url}/health`, { cache: "no-store" });
    const data = await r.json();
    return NextResponse.json({ ok: true, backend: url, health: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, backend: url, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}