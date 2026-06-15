export default function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ height: 28, width: 200, background: "var(--bg-secondary)", borderRadius: 8 }} />
      <div style={{ height: 52, width: 320, background: "var(--bg-secondary)", borderRadius: 10 }} />
      <div className="grid g3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mcard" style={{ height: 92 }}>
            <div style={{ height: 12, width: 70, background: "var(--bg-secondary)", borderRadius: 6, marginBottom: 12 }} />
            <div style={{ height: 22, width: 90, background: "var(--bg-secondary)", borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ height: 200 }} />
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="cd-spinner" /> Cargando datos del campo…
      </p>
      <style>{`
        .cd-spinner{width:14px;height:14px;border:2px solid var(--border-strong);border-top-color:var(--olive);border-radius:50%;display:inline-block;animation:cdspin .7s linear infinite}
        @keyframes cdspin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
