// app/api/chat-openai/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function POST(req: Request) {
  const backend = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const { question = "", k = 5, sourcePrefix = "", model = "" } = await req.json().catch(() => ({}));

  if (!String(question).trim()) return bad("missing body.question");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);

  try {
    const r = await fetch(`${backend}/chat/openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify({
        question,
        k: Number(k) || 5,
        ...(sourcePrefix ? { sourcePrefix } : {}),
        ...(model ? { model } : {}),
      }),
    });

    const text = await r.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: r.status });
    } catch {
      return NextResponse.json({ ok: r.ok, passthrough: true, body: text }, { status: r.status });
    }
  } catch (e: any) {
    return bad(String(e?.message || e), 500);
  } finally {
    clearTimeout(t);
  }
}
