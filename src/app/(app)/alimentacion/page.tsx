import Link from "next/link";
import { parseCat, gdpFmt, pctFmt } from "@/lib/cat";
import { getRations } from "@/lib/queries";
import { formatARS, formatKg } from "@/lib/domain";
import { IconPlus } from "@/components/icons";

const MIX_COLOR: Record<string, string> = { CARB: "#EF9F27", FIBER: "#97C459", PROTEIN: "#85B7EB" };

export default async function AlimentacionPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const cat = parseCat((await searchParams).cat);
  const rations = await getRations(cat);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Alimentación</h2>
        <Link href="/alimentacion/nuevo" className="btn"><IconPlus size={14} /> Nueva receta</Link>
      </div>

      {rations.length === 0 && <div className="empty">No hay recetas de mixer cargadas para esta categoría.</div>}

      {rations.map((r) => (
        <div key={r.lotId} style={{ marginBottom: 18 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 500 }}>{r.name}</p>
          <div className="grid g2" style={{ marginBottom: 10 }}>
            <div className="card">
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 500 }}>Receta del mixer</p>
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 9 }}>
                {r.items.map((it) => (
                  <div key={it.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span>{it.name}</span>
                      <strong>{Math.round(it.percentage)}% · {formatKg(it.kg, 2)}</strong>
                    </div>
                    <div style={{ height: 6, background: "var(--bg-secondary)", borderRadius: 3 }}>
                      <div style={{ width: `${it.percentage}%`, height: 6, background: MIX_COLOR[it.type] ?? "#999", borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 500 }}>Aporte nutricional</p>
              <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <Row label="Materia seca" value={`${pctFmt(r.dryMatterPct)}%`} />
                <Row label="Proteína bruta" value={`${pctFmt(r.proteinPct)}%`} />
                <Row label="Ración / cabeza / día" value={formatKg(r.kgPerHeadDay, 1)} />
                <Row label="Consumo MS / día" value={formatKg(r.dmiPerDay, 1)} />
                <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: 8 }}>
                  <Row label="Consumo MS (% peso vivo)" value={`${pctFmt(r.dmiBodyWeightPct)}%`} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid g3">
            <div className="mcard">
              <p className="label">Costo ración / día</p>
              <p className="value" style={{ fontSize: 20 }}>{formatARS(r.costPerDay)}</p>
              <p className="sub">por animal</p>
            </div>
            <div className="mcard">
              <p className="label">Conversión del lote</p>
              <p className="value" style={{ fontSize: 20 }}>
                {r.conversion > 0 ? `${gdpFmt(r.conversion)} :1` : "—"}
              </p>
              <p className="sub">kg MS / kg ganado</p>
            </div>
            <div className="mcard">
              <p className="label">Energía dieta</p>
              <p className="value" style={{ fontSize: 20 }}>—</p>
              <p className="sub">Mcal/kg (próx.)</p>
            </div>
          </div>
        </div>
      ))}

      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        Materia seca, proteína, consumo y conversión se calculan a partir de los % del mixer y el peso del lote.
      </p>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
