// app/chat/page.tsx
"use client";

import { useState } from "react";

type Citation = { ref: string; source: string; chunk_id: number; score?: number };
type ChatResp = { ok: boolean; answer?: string; citations?: Citation[]; error?: string };

type SearchResult = { source: string; chunk_id: number; score: number; text: string };
type SearchResp = { ok: boolean; results: SearchResult[]; total_chunks: number };

export default function ChatPage() {
  const [question, setQuestion] = useState("Summarize August 10 incident");
  const [k, setK] = useState(5);
  const [sourcePrefix, setSourcePrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ChatResp | null>(null);
  const [err, setErr] = useState("");
  const [context, setContext] = useState<SearchResp | null>(null);
  const [showCtx, setShowCtx] = useState(false);

  const ask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true); setErr(""); setResp(null); setContext(null);
    try {
      const r = await fetch("/api/chat-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, k, sourcePrefix }),
      });
      const j = (await r.json()) as ChatResp;
      if (!r.ok || j.ok === false) { setErr(j?.error || `HTTP ${r.status}`); }
      setResp(j);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const loadContext = async () => {
    setContext(null);
    try {
      const r = await fetch("/api/search/echo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: question, k, sourcePrefix }),
      });
      const j = (await r.json()) as SearchResp;
      if (r.ok && j.ok !== false) setContext(j);
    } catch {}
  };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Chat</h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        Calls backend <code>/chat/openai</code>, shows answer + citations. Optionally preview the retrieved passages.
      </p>

      <form onSubmit={ask} style={{ display: "grid", gap: 12, maxWidth: 900, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Question</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question…"
            style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
          />
        </label>

        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, width: 140 }}>
            <span>Top K</span>
            <input
              type="number" min={1} max={50} value={k}
              onChange={(e) => setK(Math.max(1, Math.min(50, Number(e.target.value))))}
              style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Folder filter (optional)</span>
            <input
              value={sourcePrefix} onChange={(e) => setSourcePrefix(e.target.value)}
              placeholder="e.g., August 2025/Weekly/Real Life Events"
              style={{ padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8 }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit" disabled={loading}
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid #111827",
              background: loading ? "#9ca3af" : "#111827", color: "white",
              cursor: !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Asking…" : "Ask"}
          </button>

          <button
            type="button"
            onClick={async () => { setShowCtx((s) => !s); if (!showCtx) await loadContext(); }}
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", cursor: "pointer",
            }}
          >
            {showCtx ? "Hide context" : "Preview context"}
          </button>
        </div>
      </form>

      {err && (
        <pre style={{ padding: 12, border: "2px dashed #fca5a5", borderRadius: 8, color: "#991b1b" }}>
          {err}
        </pre>
      )}

      {/* Answer */}
      {resp?.answer && (
        <article style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12,  maxWidth: 900 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Answer</h2>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{resp.answer}</pre>

          {resp.citations?.length ? (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Citations</h3>
              <ul style={{ marginTop: 6 }}>
                {resp.citations.map((c, idx) => (
                  <li key={idx} style={{ color: "#6b7280" }}>
                    <strong>{c.ref}</strong> — {c.source} (chunk {c.chunk_id})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      )}

      {/* Context preview (optional) */}
      {showCtx && context?.results?.length ? (
        <section style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 900 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Retrieved passages</h2>
          {context.results.map((r, i) => (
            <article key={`${r.source}-${r.chunk_id}-${i}`} id={`c${i + 1}`}
              style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 600 }}>
                  [#{i + 1}] <span style={{ color: "#6b7280" }}>{r.source}</span>
                  <span style={{ color: "#9ca3af" }}> (chunk {r.chunk_id})</span>
                </div>
                <div title="TF-IDF score" style={{ color: "#6b7280" }}>
                  score: {r.score.toFixed(3)}
                </div>
              </header>
              <pre style={{ marginTop: 8, padding: 12, borderRadius: 8, whiteSpace: "pre-wrap" }}>
                {r.text}
              </pre>
            </article>
          ))}
        </section>
      ) : showCtx ? (
        <p style={{ color: "#6b7280" }}>No context found.</p>
      ) : null}
    </main>
  );
}
