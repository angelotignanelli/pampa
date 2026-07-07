import Link from "next/link";
import { getRationDetail } from "@/lib/queries";
import { categoryLabel, formatARS, formatKg } from "@/lib/domain";
import { pctFmt, gdpFmt, pillClass } from "@/lib/cat";
import { IconArrowLeft, IconPlus } from "@/components/icons";
import { LinkSpinner } from "@/components/LinkSpinner";

const MIX_COLOR: Record<string, string> = { CARB: "#EF9F27", FIBER: "#97C459", PROTEIN: "#85B7EB" };
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });

function compactARS(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}k`;
  return formatARS(n);
}

export default async function RacionLotePage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const r = await getRationDetail(lotId);

  if (!r) {
    return (
      <div>
        <Link href="/alimentacion" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          <IconArrowLeft size={14} /> Volver a Alimentación <LinkSpinner />
        </Link>
        <div className="empty">Este lote no tiene receta cargada.</div>
      </div>
    );
  }

  const days = r.daysTotal;
  const totalLotKg = Math.round(r.headCount * r.avgWeight);

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
        <Link href={`/alimentacion/nuevo?lot=${r.lotId}`} className="btn btn-primary"><IconPlus size={14} /> Cambiar ración</Link>
      </div>

      {/* Estado del corral */}
      <div className="grid g4" style={{ marginBottom: 12 }}>
        <div className="mcard"><p className="label">Cabezas</p><p className="value" style={{ fontSize: 20 }}>{r.headCount}</p><p className="sub">en el corral</p></div>
        <div className="mcard"><p className="label">Días en el corral</p><p className="value" style={{ fontSize: 20 }}>{days}</p><p className="sub">desde la primera ración</p></div>
        <div className="mcard"><p className="label">Peso prom. / animal</p><p className="value" style={{ fontSize: 20 }}>{formatKg(Math.round(r.avgWeight))}</p><p className="sub">último pesaje</p></div>
        <div className="mcard"><p className="label">Peso vivo del lote</p><p className="value" style={{ fontSize: 20 }}>{formatKg(totalLotKg)}</p><p className="sub">{r.headCount} × {Math.round(r.avgWeight)} kg</p></div>
      </div>

      <div className="grid g2" style={{ marginBottom: 12 }}>
        <div className="card">
          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500 }}>{r.name} · composición del mixer</p>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--text-tertiary)" }}>
            Vigente desde {new Date(r.effectiveFrom).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 9 }}>
            {r.itemsCurrent.map((it) => (
              <div key={it.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span>{it.name}</span>
                  <strong>{Math.round(it.percentage)}% · {formatKg(it.kgPerAnimal, 2)}/animal</strong>
                </div>
                <div className="track">
                  <span style={{ width: `${it.percentage}%`, background: MIX_COLOR[it.type] ?? "#999" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Por animal por día */}
        <div className="card">
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 500 }}>Por animal · por día</p>
          <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Ración (tal cual)" value={formatKg(r.kgPerHeadDay, 1)} />
            <Row label="Materia seca consumida" value={formatKg(r.dmiPerDay, 1)} />
            <Row label="MS sobre peso vivo" value={`${pctFmt(r.dmiBodyWeightPct)}%`} />
            <Row label="Costo de alimento" value={formatARS(r.costPerDay)} />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <Row label="Proteína bruta de la dieta" value={`${pctFmt(r.proteinPct)}%`} />
              <Row label="Conversión del lote" value={r.conversion > 0 ? `${gdpFmt(r.conversion)} : 1` : "—"} />
            </div>
          </div>
        </div>
      </div>

      {/* Consumo del lote: por día (vigente) y acumulado sumando todas las versiones */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
          Consumo del lote · por día (ración actual) y acumulado en {days} días
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Alimento</th>
              <th className="num">Kg / día (lote)</th>
              <th className="num">Kg acumulado</th>
              <th className="num">$ / día (lote)</th>
              <th className="num">$ acumulado</th>
            </tr>
          </thead>
          <tbody>
            {r.foods.map((f) => (
              <tr key={f.name}>
                <td style={{ fontWeight: 500 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: MIX_COLOR[f.type] ?? "#999", display: "inline-block" }} />
                    {f.name}
                  </span>
                </td>
                <td className="num">{f.kgDayLotCurrent > 0 ? formatKg(Math.round(f.kgDayLotCurrent)) : "—"}</td>
                <td className="num">{formatKg(Math.round(f.kgAcc))}</td>
                <td className="num">{f.costDayLotCurrent > 0 ? compactARS(f.costDayLotCurrent) : "—"}</td>
                <td className="num">{compactARS(f.costAcc)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 600 }}>
              <td>Total ración</td>
              <td className="num">{formatKg(Math.round(r.totals.kgDayLot))}</td>
              <td className="num">{formatKg(Math.round(r.totals.kgAcc))}</td>
              <td className="num">{compactARS(r.totals.costDayLot)}</td>
              <td className="num">{compactARS(r.totals.costAcc)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--text-tertiary)", borderTop: "1px solid var(--border)" }}>
          El acumulado suma cada tramo con la ración y composición que regía en ese período. Asume las cabezas del lote constantes.
        </div>
      </div>

      {/* Historial de raciones (solo si hubo cambios) */}
      {r.versions.length > 1 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
            Historial de raciones
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Desde</th><th>Hasta</th><th className="num">Ración/día</th><th className="num">Días</th><th>Composición</th></tr>
            </thead>
            <tbody>
              {[...r.versions].reverse().map((v, i) => (
                <tr key={v.effectiveFrom + i}>
                  <td>{fmtDate(v.effectiveFrom)}</td>
                  <td>{v.effectiveTo ? fmtDate(v.effectiveTo) : <span className="pill" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>vigente</span>}</td>
                  <td className="num">{formatKg(Math.round(v.kgPerDay))}</td>
                  <td className="num">{v.days}</td>
                  <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {v.items.map((it) => `${it.name} ${Math.round(it.percentage)}%`).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
