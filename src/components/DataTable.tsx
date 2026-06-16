"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatARS, formatKg, categoryLabel } from "@/lib/domain";
import { gdpFmt, pctFmt, pillClass } from "@/lib/cat";
import { IconSearch, IconArrowLeft, IconArrowRight } from "@/components/icons";

export type Fmt = "text" | "int" | "kg" | "ars" | "pct" | "gdp" | "delta" | "cat" | "date";

export type Column = {
  key: string;
  label: string;
  fmt?: Fmt;
  align?: "left" | "right";
  width?: string;
};

export type Row = Record<string, unknown> & { href?: string };

function fmtCell(v: unknown, fmt: Fmt | undefined) {
  if (v === null || v === undefined || v === "") return <span style={{ color: "var(--text-tertiary)" }}>—</span>;
  switch (fmt) {
    case "int":
      return Math.round(Number(v)).toLocaleString("es-AR");
    case "kg":
      return formatKg(Number(v));
    case "ars":
      return formatARS(Number(v));
    case "pct":
      return `${pctFmt(Number(v))}%`;
    case "gdp":
      return gdpFmt(Number(v));
    case "delta": {
      const n = Number(v);
      const cls = n < 0.001 ? "warn" : "pos";
      return <span className={cls}>{`${n > 0 ? "+" : ""}${Math.round(n)}`}</span>;
    }
    case "cat":
      return <span className={`pill ${pillClass(String(v))}`}>{categoryLabel(String(v))}</span>;
    case "date":
      return new Date(String(v)).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });
    default:
      return String(v);
  }
}

export function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = "Buscar…",
  pageSize = 12,
  emptyText = "Sin datos.",
}: {
  columns: Column[];
  rows: Row[];
  searchKeys?: string[];
  searchPlaceholder?: string;
  pageSize?: number;
  emptyText?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const go = (href: string) => {
    setPendingHref(href);
    startTransition(() => router.push(href));
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || searchKeys.length === 0) return rows;
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(term)));
  }, [q, rows, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      {searchKeys.length > 0 && (
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ position: "relative", maxWidth: 280 }}>
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", display: "flex" }}>
              <IconSearch size={15} />
            </span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              style={{
                width: "100%",
                height: 36,
                padding: "0 12px 0 32px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: 13,
              }}
            />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: 24, fontSize: 13, color: "var(--text-tertiary)", textAlign: "center" }}>{emptyText}</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === "right" ? "num" : undefined} style={c.width ? { width: c.width } : undefined}>
                  {c.label}
                </th>
              ))}
              {rows.some((r) => r.href) && <th style={{ width: 28 }} aria-label="" />}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => {
              const loading = isPending && pendingHref === r.href;
              return (
                <tr
                  key={i}
                  onClick={r.href && !isPending ? () => go(String(r.href)) : undefined}
                  style={r.href ? { cursor: isPending ? "wait" : "pointer", opacity: isPending && !loading ? 0.5 : 1 } : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={c.align === "right" || c.fmt === "int" || c.fmt === "kg" || c.fmt === "ars" || c.fmt === "gdp" || c.fmt === "delta" || c.fmt === "pct" ? "num" : undefined}>
                      {fmtCell(r[c.key], c.fmt)}
                    </td>
                  ))}
                  {rows.some((rr) => rr.href) && (
                    <td style={{ textAlign: "right", color: "var(--text-tertiary)" }}>
                      {loading ? <span className="spin" style={{ color: "var(--olive)" }} /> : r.href ? <IconArrowRight size={15} /> : null}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {filtered.length > pageSize && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-secondary)" }}>
          <span>
            {current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} de {filtered.length}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="icon-btn" style={{ width: 30, height: 30 }} disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Anterior">
              <IconArrowLeft size={15} />
            </button>
            <button className="icon-btn" style={{ width: 30, height: 30 }} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Siguiente">
              <IconArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
