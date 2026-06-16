import Link from "next/link";
import { parseCat, pillClass } from "@/lib/cat";
import { getEconomy, getOverview, getLots, getOwnerSplit } from "@/lib/queries";
import { formatARS, formatKg, categoryLabel } from "@/lib/domain";
import { IconBell, IconUsers } from "@/components/icons";

function compactARS(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}k`;
  return formatARS(n);
}

export default async function EconomiaPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const cat = parseCat((await searchParams).cat);
  const [{ rows, salePrice }, overview, lots, split] = await Promise.all([
    getEconomy(cat),
    getOverview(cat),
    getLots(cat),
    getOwnerSplit(cat),
  ]);

  const fattening = lots.filter((l) => l.category !== "COW");
  const sellReady = fattening.find((l) => l.avgWeight >= 420);
  const marginPerKg = overview.costPerKg !== null ? salePrice - overview.costPerKg : null;

  return (
    <>
      <h2 className="section-title">Economía y rentabilidad</h2>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="mcard">
          <p className="label">Costo / kg prod.</p>
          <p className="value" style={{ fontSize: 20 }}>{overview.costPerKg !== null ? formatARS(overview.costPerKg) : "—"}</p>
        </div>
        <div className="mcard">
          <p className="label">Precio venta / kg</p>
          <p className="value" style={{ fontSize: 20 }}>{formatARS(salePrice)}</p>
        </div>
        <div className="mcard">
          <p className="label">Margen / kg</p>
          <p className="value pos" style={{ fontSize: 20 }}>{marginPerKg !== null ? formatARS(marginPerKg) : "—"}</p>
        </div>
        <div className="mcard">
          <p className="label">Cabezas</p>
          <p className="value" style={{ fontSize: 20 }}>{overview.headCount.toLocaleString("es-AR")}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
          Rentabilidad por lote
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Categoría</th>
              <th className="num">Alimentación (90d)</th>
              <th className="num">Veterinaria</th>
              <th className="num">Costo/kg</th>
              <th className="num">Margen/kg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lotId}>
                <td style={{ fontWeight: 500 }}>{r.lotName}</td>
                <td>
                  <span className={`pill ${pillClass(r.category)}`}>{categoryLabel(r.category)}</span>
                </td>
                <td className="num">{compactARS(r.feedCost)}</td>
                <td className="num">{compactARS(r.vetCost)}</td>
                <td className="num">{r.costPerKg !== null ? formatARS(r.costPerKg) : "—"}</td>
                <td className={`num ${r.marginPerKg !== null ? "pos" : ""}`}>
                  {r.marginPerKg !== null ? `+${formatARS(r.marginPerKg)}` : "cría"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {split.owners.length > 0 && (
        <div className="card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 7 }}>
              <IconUsers size={15} /> Reparto por socio
            </span>
            <Link href="/socios" style={{ fontSize: 12, color: "var(--text-secondary)" }}>Gestionar socios →</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Socio</th>
                <th className="num">Kg de carne</th>
                <th className="num">Valor</th>
                <th className="num">Margen</th>
              </tr>
            </thead>
            <tbody>
              {split.owners.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 500 }}>
                    {o.name}
                    {o.globalPct !== null && (
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 8 }}>{o.globalPct}% global</span>
                    )}
                  </td>
                  <td className="num">{formatKg(o.kg)}</td>
                  <td className="num">{formatARS(o.valueShare)}</td>
                  <td className="num pos">{formatARS(o.marginShare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--text-tertiary)", borderTop: "1px solid var(--border)" }}>
            Según la participación de cada socio (global o el reparto propio de cada lote). El margen de las vacas de cría no se reparte.
          </div>
        </div>
      )}

      {sellReady && (
        <div className="card" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, borderColor: "var(--info-text)" }}>
          <span style={{ color: "var(--info-text)" }}><IconBell size={22} /></span>
          <div style={{ fontSize: 12 }}>
            <strong>Punto de venta sugerido:</strong> {sellReady.name} promedia {Math.round(sellReady.avgWeight)} kg;
            superados los 420 kg la conversión cae y conviene venderlos.
          </div>
        </div>
      )}
    </>
  );
}
