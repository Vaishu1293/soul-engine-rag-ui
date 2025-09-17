// app/api/analyze/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; export const revalidate = 0;

function bad(msg: string, code = 400) { return NextResponse.json({ ok: false, error: msg }, { status: code }); }

export async function POST(req: Request) {
  const backend = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const body = await req.json().catch(() => ({}));
  const { mode = "retrieve", k = 12, instruction = "", model = "" } = body;

  // mode-specific validation
  if (mode === "retrieve") {
    if (!String(body.query || "").trim()) return bad("missing body.query for mode=retrieve");
  } else if (mode === "file" || mode === "folder") {
    if (!String(body.target || "").trim()) return bad("missing body.target for mode=" + mode);
  } else return bad("unknown mode: " + String(mode));

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);

  try {
    const r = await fetch(`${backend}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        mode,
        k: Number(k) || 12,
        instruction,
        ...(model ? { model } : {}),
        ...(body.query ? { query: body.query } : {}),
        ...(body.sourcePrefix ? { sourcePrefix: body.sourcePrefix } : {}),
        ...(body.target ? { target: body.target } : {}),
      }),
    });
    const text = await r.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: r.status });
    } catch {
      return NextResponse.json({ ok: r.ok, passthrough: true, body: text }, { status: r.status });
    }
  } catch (e: any) {
    return bad(String(e?.message || e), 500);
  } finally { clearTimeout(t); }
}
