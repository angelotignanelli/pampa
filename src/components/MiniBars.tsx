export type MiniBar = { label: string; value: number; color?: string };

// Mini-gráfico de barras (preview). Render puro, sin JS de cliente.
export function MiniBars({ items, fmt }: { items: MiniBar[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const show = (n: number) => (fmt ? fmt(n) : n.toLocaleString("es-AR"));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
      {items.map((it) => (
        <div key={it.label} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>{show(it.value)}</div>
          <div style={{ height: 56, display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${Math.round((it.value / max) * 100)}%`,
                minHeight: it.value > 0 ? 5 : 0,
                background: it.color ?? "var(--olive)",
                borderRadius: "6px 6px 0 0",
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 6, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
