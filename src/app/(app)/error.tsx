"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, maxWidth: 420 }}>
      <h2 className="section-title" style={{ margin: 0 }}>No pudimos cargar esta sección</h2>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Puede ser una demora de la base de datos. Probá de nuevo en un momento.
      </p>
      <button className="btn btn-primary" onClick={() => reset()}>Reintentar</button>
    </div>
  );
}
