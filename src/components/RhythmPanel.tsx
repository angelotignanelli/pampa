"use client";

import { useState } from "react";
import { formatARS, formatKg } from "@/lib/domain";
import { IconInfoCircle } from "@/components/icons";

export type RhythmItem = {
  label: string;
  color: string;
  value: number; // valor estimado ARS
  cabezas: number;
  kg: number; // peso total vivo
};

const TABS = [
  { key: "value", label: "Valor" },
  { key: "cabezas", label: "Cabezas" },
  { key: "kg", label: "Peso" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function RhythmPanel({ items }: { items: RhythmItem[] }) {
  const [tab, setTab] = useState<TabKey>("value");

  const fmt = (it: RhythmItem) =>
    tab === "value" ? formatARS(it.value) : tab === "cabezas" ? `${it.cabezas}` : formatKg(it.kg);

  const max = Math.max(1, ...items.map((it) => it[tab]));

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>Ritmo del rodeo</span>
          <span style={{ color: "var(--text-tertiary)", display: "flex" }}><IconInfoCircle size={15} /></span>
        </div>
        <div style={{ display: "flex", gap: 2, background: "var(--bg-secondary)", borderRadius: 12, padding: 3 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                padding: "5px 12px",
                borderRadius: 9,
                background: tab === t.key ? "var(--bg-primary)" : "transparent",
                color: tab === t.key ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: tab === t.key ? 500 : 400,
                boxShadow: tab === t.key ? "var(--shadow-card)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 14 }}>
        {items.map((it) => (
          <div key={it.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: it.color }} />
              <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>{fmt(it)}</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{it.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 14, marginTop: 14, alignItems: "end", height: 96 }}>
        {items.map((it) => {
          const h = Math.max(28, Math.round((it[tab] / max) * 100));
          return <div key={it.label} style={{ height: `${h}%`, background: it.color, borderRadius: 12 }} />;
        })}
      </div>
    </div>
  );
}
