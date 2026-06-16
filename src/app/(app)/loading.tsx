export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ height: 26, width: 220, background: "var(--bg-secondary)", borderRadius: 8 }} />
      <div className="grid g3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mcard" style={{ height: 80 }} />
        ))}
      </div>
      <div className="card" style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-tertiary)" }}>
          <span className="spin" style={{ color: "var(--olive)" }} /> Cargando datos del campo…
        </span>
      </div>
    </div>
  );
}
