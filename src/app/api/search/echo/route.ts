// app/api/search/echo/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; export const revalidate = 0;

export async function POST(req: Request) {
  const backend = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const { q = "", k = 5, sourcePrefix = "" } = await req.json().catch(() => ({}));
  if (!String(q).trim()) return NextResponse.json({ ok: false, error: "missing body.q" }, { status: 400 });

  const url = new URL(`${backend}/search`);
  url.searchParams.set("q", q); url.searchParams.set("k", String(k));
  if (sourcePrefix) url.searchParams.set("sourcePrefix", sourcePrefix);

  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}
