// app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";

/* ====================== Shared Types ====================== */
type Passage = { source: string; chunk_id: number; score: number; text: string };
type SearchResp = { ok: boolean; total_chunks: number; results: Passage[]; error?: string };
type Citation = { ref: string; source: string; chunk_id: number; score?: number };
type ChatResp = {
  ok: boolean;
  answer?: string;
  citations?: Citation[];
  error?: string;
  prompt?: string;
  using?: string;
  model?: string;
  question?: string;
  k?: number;
};
type SummResp = { ok: boolean; answer?: string; citations?: Citation[]; error?: string; prompt?: string };
type AnalResp = { ok: boolean; answer?: string; citations?: Citation[]; error?: string; prompt?: string };

/* ====================== Shared UI Helpers ====================== */
const styles = {
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    outline: "none",
  } as React.CSSProperties,
  btnSolid: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #111827",
    color: "#111827",
    cursor: "pointer",
  } as React.CSSProperties,
  btnDashed: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px dashed #d1d5db",
    cursor: "pointer",
  } as React.CSSProperties,
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
  } as React.CSSProperties,
  pre: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    border: "1px dashed #e5e7eb",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 280,
    overflow: "auto",
  } as React.CSSProperties,
  error: {
    padding: 12,
    border: "2px dashed #fca5a5",
    borderRadius: 8,
    color: "#991b1b",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  } as React.CSSProperties,
};

/* ====================== Search Panel ====================== */
function SearchPanel() {
  const [q, setQ] = useState("eclipse 2025");
  const [k, setK] = useState(5);
  const [sourcePrefix, setSourcePrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SearchResp | null>(null);
  const [err, setErr] = useState("");

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setErr("");
    setResp(null);
    try {
      const params = new URLSearchParams({ q, k: String(k) });
      if (sourcePrefix.trim()) params.set("sourcePrefix", sourcePrefix.trim());
      const r = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      const j = (await r.json()) as SearchResp;
      if (!r.ok || j.ok === false) setErr(j?.error || `HTTP ${r.status}`);
      setResp(j);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: 20, margin: "4px 0 12px" }}>Search</h2>
      <form onSubmit={doSearch} style={{ display: "grid", gap: 12, maxWidth: 900, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Query</span>
          <input style={styles.input} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, width: 140 }}>
            <span>Top K</span>
            <input
              type="number"
              min={1}
              max={50}
              value={k}
              onChange={(e) => setK(Math.max(1, Math.min(50, Number(e.target.value))))}
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Folder filter (sourcePrefix, optional)</span>
            <input
              style={styles.input}
              value={sourcePrefix}
              onChange={(e) => setSourcePrefix(e.target.value)}
              placeholder="e.g., August 2025/Weekly"
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={loading} style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #111827",
              color: "#ffffff",          // <- dark text (was "white")               // <- keep visible even when disabled
              cursor: loading ? "not-allowed" : "pointer",
            }}>
            {loading ? "Searching…" : "Search"}
          </button>
          {resp && <div style={{ alignSelf: "center", color: "#6b7280" }}>total_chunks: <strong>{resp.total_chunks}</strong></div>}
        </div>
      </form>

      {err && <pre style={styles.error}>{err}</pre>}

      {resp?.results?.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {resp.results.map((r, i) => (
            <article key={`${r.source}-${r.chunk_id}-${i}`} style={styles.card}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 600 }}>
                  [#{i + 1}] <span style={{ color: "#6b7280" }}>{r.source}</span>
                  <span style={{ color: "#9ca3af" }}> (chunk {r.chunk_id})</span>
                </div>
                <div title="TF-IDF score" style={{ color: "#6b7280" }}>score: {r.score.toFixed(3)}</div>
              </header>
              <pre style={styles.pre}>{r.text}</pre>
            </article>
          ))}
        </div>
      ) : resp ? (
        <p style={{ color: "#6b7280" }}>No results.</p>
      ) : null}
    </section>
  );
}

/* ====================== Chat Panel ====================== */
function ChatPanel() {
  const [question, setQuestion] = useState("Summarize August 10 incident");
  const [k, setK] = useState(5);
  const [sourcePrefix, setSourcePrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<ChatResp | null>(null);
  const [err, setErr] = useState("");
  const [context, setContext] = useState<SearchResp | null>(null);
  const [showCtx, setShowCtx] = useState(false);
  const ctxKeyRef = useRef<string>("");

  const ask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setErr("");
    setResp(null);
    try {
      const r = await fetch("/api/chat-openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, k, sourcePrefix }),
      });
      const j = (await r.json()) as ChatResp;
      if (!r.ok || j.ok === false) setErr(j?.error || `HTTP ${r.status}`);
      setResp(j);
      ctxKeyRef.current = `${question}__${k}__${sourcePrefix || ""}`;
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const ensureContextLoaded = async () => {
    const wantKey = `${question}__${k}__${sourcePrefix || ""}`;
    if (!context || ctxKeyRef.current !== wantKey) {
      const params = new URLSearchParams({ q: question, k: String(k) });
      if (sourcePrefix) params.set("sourcePrefix", sourcePrefix);
      try {
        const r = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
        const j = (await r.json()) as SearchResp;
        if (r.ok && j.ok !== false) {
          setContext(j);
          ctxKeyRef.current = wantKey;
        }
      } catch {
        /* ignore */
      }
    }
  };

  const toggleContext = async () => {
    const next = !showCtx;
    setShowCtx(next);
    if (next) await ensureContextLoaded();
  };

  const jumpToCitation = async (ref: string) => {
    const idx = Number(ref.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(idx) || idx < 1) return;
    if (!showCtx) {
      await toggleContext();
    } else {
      await ensureContextLoaded();
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(`c${idx}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch { }
  };

  return (
    <section>
      <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>Chat</h2>
      <form onSubmit={ask} style={{ display: "grid", gap: 12, maxWidth: 900, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Question</span>
          <input style={styles.input} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, width: 140 }}>
            <span>Top K</span>
            <input
              type="number"
              min={1}
              max={50}
              value={k}
              onChange={(e) => setK(Math.max(1, Math.min(50, Number(e.target.value))))}
              style={styles.input}
            />
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Folder filter (optional)</span>
            <input
              style={styles.input}
              value={sourcePrefix}
              onChange={(e) => setSourcePrefix(e.target.value)}
              placeholder="e.g., August 2025/Weekly/Real Life Events"
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #111827",
              color: "#ffffff",          // <- dark text (was "white")               // <- keep visible even when disabled
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Asking…" : "Ask"}
          </button>

          <button type="button" onClick={toggleContext} style={styles.btnDashed}>
            {showCtx ? "Hide context" : "Preview context"}
          </button>
        </div>
      </form>

      {err && <pre style={styles.error}>{err}</pre>}

      {resp?.answer && (
        <article style={{ ...styles.card, maxWidth: 900, marginTop: 8 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Answer</h3>
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              {resp.using ? <span>via <strong>{resp.using}</strong></span> : null}
              {resp.model ? <span>{resp.using ? " · " : ""}model <strong>{resp.model}</strong></span> : null}
            </div>
          </header>

          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{resp.answer}</pre>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button onClick={() => copyText(resp.answer || "")} style={styles.btnDashed}>Copy answer</button>
            {resp.prompt ? <button onClick={() => copyText(resp.prompt!)} style={styles.btnDashed}>Copy prompt</button> : null}
          </div>

          {resp.citations?.length ? (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ margin: 0, fontSize: 16 }}>Citations</h4>
              <ul style={{ marginTop: 6 }}>
                {resp.citations.map((c, idx) => (
                  <li key={idx} style={{ color: "#6b7280" }}>
                    <button
                      onClick={() => jumpToCitation(c.ref)}
                      title="Scroll to retrieved passage"
                      style={{ border: "1px dashed #d1d5db", borderRadius: 6, padding: "2px 6px", cursor: "pointer", marginRight: 8 }}
                    >
                      {c.ref}
                    </button>
                    {c.source} (chunk {c.chunk_id})
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      )}

      {showCtx && context?.results?.length ? (
        <section style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 900 }}>
          <h3 style={{ fontSize: 18, margin: 0 }}>Retrieved passages</h3>
          {context.results.map((r, i) => (
            <article key={`${r.source}-${r.chunk_id}-${i}`} id={`c${i + 1}`} style={styles.card}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 600 }}>
                  [#{i + 1}] <span style={{ color: "#6b7280" }}>{r.source}</span>
                  <span style={{ color: "#9ca3af" }}> (chunk {r.chunk_id})</span>
                </div>
                <div title="TF-IDF score" style={{ color: "#6b7280" }}>score: {r.score.toFixed(3)}</div>
              </header>
              <pre style={styles.pre}>{r.text}</pre>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => navigator.clipboard.writeText(`[#${i + 1}] ${r.source} (chunk ${r.chunk_id})`)}
                  style={styles.btnDashed}
                >
                  Copy citation label
                </button>
              </div>
            </article>
          ))}
        </section>
      ) : showCtx ? (
        <p style={{ color: "#6b7280" }}>No context found.</p>
      ) : null}
    </section>
  );
}

/* ====================== Summarize Panel ====================== */
function SummarizePanel() {
  const [mode, setMode] = useState<"file" | "folder">("file");
  const [target, setTarget] = useState("August 2025/Miscellaneous/August 10 incident.pdf");
  const [k, setK] = useState(20);
  const [question, setQuestion] = useState("Summarize the key events and outcomes with dates. Cite.");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SummResp | null>(null);
  const [err, setErr] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setErr("");
    setResp(null);
    try {
      const r = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, target, k, question }),
      });
      const j = (await r.json()) as SummResp;
      if (!r.ok || j.ok === false) setErr(j?.error || `HTTP ${r.status}`);
      setResp(j);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>Summarize</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 900, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={styles.input}>
              <option value="file">file</option>
              <option value="folder">folder</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>{mode === "file" ? "File path (exact)" : "Folder prefix"}</span>
            <input style={styles.input} value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label style={{ display: "grid", gap: 6, width: 140 }}>
            <span>Chunks K</span>
            <input
              type="number"
              min={1}
              max={200}
              value={k}
              onChange={(e) => setK(Math.max(1, Math.min(200, Number(e.target.value))))}
              style={styles.input}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Instruction (optional)</span>
          <input style={styles.input} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>

        <button type="submit" disabled={loading} style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #111827",
              color: "#ffffff",          // <- dark text (was "white")               // <- keep visible even when disabled
              cursor: loading ? "not-allowed" : "pointer",
            }}>
          {loading ? "Summarizing…" : "Summarize"}
        </button>
      </form>

      {err && <pre style={styles.error}>{err}</pre>}

      {resp?.answer && (
        <article style={{ ...styles.card, maxWidth: 900 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Summary</h3>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{resp.answer}</pre>
          {resp.citations?.length ? (
            <ul style={{ marginTop: 10, color: "#6b7280" }}>
              {resp.citations.map((c, idx) => (
                <li key={idx}>
                  <strong>{c.ref}</strong> — {c.source} (chunk {c.chunk_id})
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      )}
    </section>
  );
}

/* ====================== Analyze Panel ====================== */
function AnalyzePanel() {
  const [mode, setMode] = useState<"retrieve" | "file" | "folder">("retrieve");
  const [query, setQuery] = useState("eclipse August 2025");
  const [target, setTarget] = useState("");
  const [k, setK] = useState(12);
  const [sourcePrefix, setSourcePrefix] = useState("");
  const [instruction, setInstruction] = useState("Extract a dated timeline and outcomes. Cite each bullet.");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<AnalResp | null>(null);
  const [err, setErr] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setErr("");
    setResp(null);
    try {
      const body: any = { mode, k, instruction };
      if (mode === "retrieve") {
        body.query = query;
        if (sourcePrefix) body.sourcePrefix = sourcePrefix;
      } else {
        body.target = target;
      }
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as AnalResp;
      if (!r.ok || j.ok === false) setErr(j?.error || `HTTP ${r.status}`);
      setResp(j);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: 20, margin: "24px 0 12px" }}>Analyze</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 900, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Mode</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} style={styles.input}>
              <option value="retrieve">retrieve</option>
              <option value="file">file</option>
              <option value="folder">folder</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, width: 140 }}>
            <span>Chunks K</span>
            <input
              type="number"
              min={1}
              max={200}
              value={k}
              onChange={(e) => setK(Math.max(1, Math.min(200, Number(e.target.value))))}
              style={styles.input}
            />
          </label>

          {mode === "retrieve" ? (
            <>
              <label style={{ display: "grid", gap: 6, flex: 1 }}>
                <span>Query</span>
                <input style={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6, flex: 1 }}>
                <span>Folder filter (optional)</span>
                <input style={styles.input} value={sourcePrefix} onChange={(e) => setSourcePrefix(e.target.value)} />
              </label>
            </>
          ) : (
            <label style={{ display: "grid", gap: 6, flex: 1 }}>
              <span>{mode === "file" ? "File path (exact)" : "Folder prefix"}</span>
              <input style={styles.input} value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
          )}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Instruction</span>
          <input style={styles.input} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
        </label>

        <button type="submit" disabled={loading} style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #111827",
              color: "#ffffff",          // <- dark text (was "white")               // <- keep visible even when disabled
              cursor: loading ? "not-allowed" : "pointer",
            }}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </form>

      {err && <pre style={styles.error}>{err}</pre>}

      {resp?.answer && (
        <article style={{ ...styles.card, maxWidth: 900 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Result</h3>
          <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{resp.answer}</pre>
          {resp.citations?.length ? (
            <ul style={{ marginTop: 10, color: "#6b7280" }}>
              {resp.citations.map((c, idx) => (
                <li key={idx}>
                  <strong>{c.ref}</strong> — {c.source} (chunk {c.chunk_id})
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      )}
    </section>
  );
}

/* ====================== Root Page with Tabs ====================== */
export default function RAGAllInOnePage() {
  const tabs = ["Search", "Chat", "Summarize", "Analyze"] as const;
  type Tab = (typeof tabs)[number];
  const [tab, setTab] = useState<Tab>("Search");

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>RAG UI — All in one</h1>

      <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: tab === t ? "2px solid #111827" : "1px dashed #d1d5db",
              cursor: "pointer",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Search" && <SearchPanel />}
      {tab === "Chat" && <ChatPanel />}
      {tab === "Summarize" && <SummarizePanel />}
      {tab === "Analyze" && <AnalyzePanel />}
    </main>
  );
}
