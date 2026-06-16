import Link from "next/link";
import { getRations } from "@/lib/queries";
import { categoryLabel, formatARS, formatKg } from "@/lib/domain";
import { pctFmt, gdpFmt, pillClass } from "@/lib/cat";
import { IconArrowLeft, IconPlus } from "@/components/icons";

const MIX_COLOR: Record<string, string> = { CARB: "#EF9F27", FIBER: "#97C459", PROTEIN: "#85B7EB" };

export default async function RacionLotePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const rations = await getRations("ALL");
  const r = rations.find((x) => x.lotId === lotId);

  if (!r) {
    return (
      <div>
        <Link href="/alimentacion" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          <IconArrowLeft size={14} /> Volver a Alimentación
        </Link>
        <div className="empty">Este lote no tiene receta cargada.</div>
      </div>
    );
  }

  return (
    <>
      <Link href="/alimentacion" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Volver a Alimentación
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="section-title" style={{ margin: 0 }}>{r.lotName}</h2>
          <span className={`pill ${pillClass(r.category)}`}>{categoryLabel(r.category)}</span>
        </div>
        <Link href="/alimentacion/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nueva receta</Link>
      </div>

      <div className="grid g2" style={{ marginBottom: 12 }}>
        <div className="card">
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 500 }}>{r.name}</p>
          <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 9 }}>
            {r.items.map((it) => (
              <div key={it.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span>{it.name}</span>
                  <strong>{Math.round(it.percentage)}% · {formatKg(it.kg, 2)}</strong>
                </div>
                <div className="track">
                  <span style={{ width: `${it.percentage}%`, background: MIX_COLOR[it.type] ?? "#999" }} />
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
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <Row label="Consumo MS (% peso vivo)" value={`${pctFmt(r.dmiBodyWeightPct)}%`} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid g3">
        <div className="mcard"><p className="label">Costo ración / día</p><p className="value" style={{ fontSize: 20 }}>{formatARS(r.costPerDay)}</p><p className="sub">por animal</p></div>
        <div className="mcard"><p className="label">Conversión del lote</p><p className="value" style={{ fontSize: 20 }}>{r.conversion > 0 ? `${gdpFmt(r.conversion)} :1` : "—"}</p><p className="sub">kg MS / kg ganado</p></div>
        <div className="mcard"><p className="label">Ración por cabeza</p><p className="value" style={{ fontSize: 20 }}>{formatKg(r.kgPerHeadDay, 1)}</p><p className="sub">por día</p></div>
      </div>
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
