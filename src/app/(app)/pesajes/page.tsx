import Link from "next/link";
import { parseCat, gdpFmt } from "@/lib/cat";
import { getWeighingRows } from "@/lib/queries";
import { IconPlus } from "@/components/icons";

export default async function PesajesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const cat = parseCat((await searchParams).cat);
  const lots = await getWeighingRows(cat);
  const hasData = lots.some((l) => l.rows.length > 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Pesajes</h2>
        <Link href="/pesajes/nuevo" className="btn"><IconPlus size={14} /> Nuevo pesaje</Link>
      </div>

      {!hasData && <div className="empty">No hay pesajes cargados para esta categoría.</div>}

      {lots.map((lot) => {
        if (lot.rows.length === 0) return null;
        const alerts = lot.rows.filter((r) => r.gdp !== null && r.gdp < 0.4).length;
        return (
          <div key={lot.lotName} className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Historial por animal · {lot.lotName}</span>
              {alerts > 0 && (
                <span className="pill" style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}>
                  {alerts} sin progreso
                </span>
              )}
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Caravana</th>
                  <th className="num">Pesaje ant.</th>
                  <th className="num">Actual</th>
                  <th className="num">Δ kg</th>
                  <th className="num">GDP</th>
                </tr>
              </thead>
              <tbody>
                {lot.rows.slice(0, 12).map((r) => {
                  const low = r.gdp !== null && r.gdp < 0.4;
                  return (
                    <tr key={r.tag}>
                      <td style={{ fontWeight: 500 }}>{r.tag}</td>
                      <td className="num">{r.prevKg !== null ? Math.round(r.prevKg) : "—"}</td>
                      <td className="num">{r.currKg !== null ? Math.round(r.currKg) : "—"}</td>
                      <td className={`num ${low ? "warn" : "pos"}`}>
                        {r.delta !== null ? `${r.delta > 0 ? "+" : ""}${Math.round(r.delta)}` : "—"}
                      </td>
                      <td className={`num ${low ? "warn" : ""}`}>{r.gdp !== null ? gdpFmt(r.gdp) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {lot.rows.length > 12 && (
              <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--text-tertiary)", borderTop: "0.5px solid var(--border)" }}>
                Mostrando 12 de {lot.rows.length} animales.
              </div>
            )}
          </div>
        );
      })}

      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        En el campo, esta carga se hace desde el celular leyendo el chip/caravana. La balanza puede enviar el peso por bluetooth (fase posterior).
      </p>
    </>
  );
}
