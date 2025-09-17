// app/api/search/route.ts
import { NextResponse } from "next/server";

// Ensure Node runtime + no caching
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const k = (searchParams.get("k") || "5").trim();
  const sourcePrefix = (searchParams.get("sourcePrefix") || "").trim();

  if (!q) return badRequest("missing q");

  const backend = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const url = new URL(`${backend}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("k", k);
  if (sourcePrefix) url.searchParams.set("sourcePrefix", sourcePrefix);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const r = await fetch(url.toString(), { cache: "no-store", signal: controller.signal });
    const text = await r.text();

    // Try to forward JSON if possible; otherwise return raw text
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: r.status });
    } catch {
      return NextResponse.json(
        { ok: r.ok, passthrough: true, body: text },
        { status: r.status }
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  } finally {
    clearTimeout(t);
  }
}
