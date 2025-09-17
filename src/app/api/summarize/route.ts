// app/api/summarize/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs"; export const dynamic = "force-dynamic"; export const revalidate = 0;

function bad(msg: string, code = 400) { return NextResponse.json({ ok: false, error: msg }, { status: code }); }

export async function POST(req: Request) {
  const backend = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const body = await req.json().catch(() => ({}));
  const { mode = "file", target = "", k = 20, question = "", model = "" } = body;

  if (!String(target).trim()) return bad("missing body.target (file path or folder prefix)");
  if (!["file", "folder"].includes(String(mode))) return bad("mode must be 'file' or 'folder'");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);

  try {
    const r = await fetch(`${backend}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        mode, target, k: Number(k) || 20,
        ...(question ? { question } : {}),
        ...(model ? { model } : {}),
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
