import Link from "next/link";
import { parseCat, gdpFmt, pillClass } from "@/lib/cat";
import { getLots } from "@/lib/queries";
import { categoryLabel, formatKg } from "@/lib/domain";
import { IconPlus } from "@/components/icons";

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const cat = parseCat((await searchParams).cat);
  const lots = await getLots(cat);
  const headCount = lots.reduce((a, l) => a + l.headCount, 0);
  const paddocks = new Set(lots.map((l) => l.paddock).filter(Boolean)).size;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Lotes y hacienda</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/movimientos/nuevo" className="btn"><IconPlus size={14} /> Movimiento</Link>
          <Link href="/animales/nuevo" className="btn"><IconPlus size={14} /> Animal</Link>
          <Link href="/lotes/nuevo" className="btn"><IconPlus size={14} /> Lote</Link>
        </div>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="mcard">
          <p className="label">Cabezas</p>
          <p className="value" style={{ fontSize: 20 }}>{headCount.toLocaleString("es-AR")}</p>
        </div>
        <div className="mcard">
          <p className="label">Lotes activos</p>
          <p className="value" style={{ fontSize: 20 }}>{lots.length}</p>
        </div>
        <div className="mcard">
          <p className="label">Potreros</p>
          <p className="value" style={{ fontSize: 20 }}>{paddocks}</p>
        </div>
      </div>

      {lots.length === 0 ? (
        <div className="empty">No hay lotes para esta categoría.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Categoría</th>
                <th>Potrero</th>
                <th className="numl">Cab.</th>
                <th className="numl">Peso</th>
                <th className="numl">GDP</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((l) => {
                const low = l.gdp < 0.5;
                return (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.name}</td>
                    <td><span className={`pill ${pillClass(l.category)}`}>{categoryLabel(l.category)}</span></td>
                    <td style={{ color: "var(--text-secondary)" }}>{l.paddock ?? "—"}</td>
                    <td className="numl">{l.headCount}</td>
                    <td className="numl">{formatKg(l.avgWeight)}</td>
                    <td className={`numl ${low ? "warn" : "pos"}`}>{gdpFmt(l.gdp)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        Movimientos (compras, ventas, nacimientos, muertes y recategorización ternero → novillo) quedan registrados por lote.
      </p>
    </>
  );
}
