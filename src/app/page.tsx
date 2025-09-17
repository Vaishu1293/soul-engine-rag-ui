// app/search/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Result = { source: string; chunk_id: number; score: number; text: string };
type SearchResp = { ok: boolean; total_chunks: number; results: Result[]; error?: string };

export default function SearchPage() {
  const [q, setQ] = useState("eclipse 2025");
  const [k, setK] = useState(5);
  const [sourcePrefix, setSourcePrefix] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<SearchResp | null>(null);
  const [err, setErr] = useState<string>("");

  const canSearch = useMemo(() => q.trim().length > 0 && k > 0, [q, k]);

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSearch) return;
    setLoading(true);
    setErr("");
    setResp(null);
    try {
      const params = new URLSearchParams({ q, k: String(k) });
      if (sourcePrefix.trim()) params.set("sourcePrefix", sourcePrefix.trim());
      const r = await fetch(`/api/search?${params.toString()}`, { cache: "no-store" });
      const j = (await r.json()) as SearchResp;
      if (!r.ok || j.ok === false) {
        setErr(j?.error || `HTTP ${r.status}`);
      } else {
        setResp(j);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  // optional: run one demo search on mount
  useEffect(() => {
    doSearch().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Search</h1>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        Queries the backend <code>/search</code> and shows top-K passages with scores &amp; citation info.
      </p>

      <form onSubmit={doSearch} style={{ display: "grid", gap: 12, maxWidth: 900, marginBottom: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Query</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type your question or keywords…"
            style={{
              padding: "10px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              outline: "none",
            }}
          />
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
              style={{
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, flex: 1 }}>
            <span>Folder filter (sourcePrefix, optional)</span>
            <input
              value={sourcePrefix}
              onChange={(e) => setSourcePrefix(e.target.value)}
              placeholder="e.g., August 2025/Weekly"
              style={{
                padding: "10px 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                outline: "none",
              }}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={!canSearch || loading}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #111827",
              background: loading ? "#9ca3af" : "#111827",
              color: "white",
              cursor: canSearch && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>

          {resp && (
            <div style={{ alignSelf: "center", color: "#6b7280" }}>
              total_chunks: <strong>{resp.total_chunks}</strong>
            </div>
          )}
        </div>
      </form>

      {err && (
        <pre
          style={{
            marginTop: 8,
            padding: 12,
            border: "2px dashed #fca5a5",
            borderRadius: 8,
            color: "#991b1b",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {err}
        </pre>
      )}

      {/* Results */}
      {resp?.results?.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {resp.results.map((r, i) => (
            <article
              key={`${r.source}-${r.chunk_id}-${i}`}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12
              }}
            >
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  [#{i + 1}] <span style={{ color: "#6b7280" }}>{r.source}</span>
                  <span style={{ color: "#9ca3af" }}> (chunk {r.chunk_id})</span>
                </div>
                <div title="TF-IDF score" style={{ color: "#6b7280" }}>
                  score: {r.score.toFixed(3)}
                </div>
              </header>

              <pre
                style={{
                  marginTop: 8,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 280,
                  overflow: "auto",
                }}
              >
                {r.text}
              </pre>

              <footer style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => navigator.clipboard.writeText(`[#${i + 1}] ${r.source} (chunk ${r.chunk_id})`)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    cursor: "pointer",
                  }}
                >
                  Copy citation label
                </button>
                <small style={{ color: "#6b7280" }}>
                  Use <code>[#{i + 1}]</code> to cite this passage.
                </small>
              </footer>
            </article>
          ))}
        </div>
      ) : resp && !loading ? (
        <p style={{ color: "#6b7280" }}>No results.</p>
      ) : null}
    </main>
  );
}
