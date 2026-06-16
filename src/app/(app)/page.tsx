import { getSession } from "@/lib/auth";
import { parseCat, gdpFmt, pillClass } from "@/lib/cat";
import { getLots, getOverview, getHerdHealth, getEconomy, herdValue } from "@/lib/queries";
import { formatARS, formatKg, categoryLabel } from "@/lib/domain";
import { Gauge } from "@/components/Gauge";
import { RhythmPanel, type RhythmItem } from "@/components/RhythmPanel";
import { IconArrowUpRight, IconSparkles, IconSearch, IconDownload } from "@/components/icons";

const CAT_COLOR: Record<string, string> = { STEER: "#3e4a35", CALF: "#d8cfa8", COW: "#c9bdd7" };
const CAT_ORDER = ["STEER", "CALF", "COW"];

export default async function ResumenPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat = parseCat((await searchParams).cat);
  const [user, lots, overview, health, economy] = await Promise.all([
    getSession(),
    getLots(cat),
    getOverview(cat),
    getHerdHealth(cat),
    getEconomy(cat),
  ]);

  const firstName = user?.name.split(" ")[0] ?? "";
  const priceByCat = economy.prices.byCat;
  const priceFor = (c: string) => priceByCat[c as keyof typeof priceByCat] ?? 0;
  const totalValue = herdValue(lots, priceByCat);

  // Agrupación por categoría para el ritmo
  const byCat = new Map<string, RhythmItem>();
  for (const l of lots) {
    const kg = l.headCount * l.avgWeight;
    const prev = byCat.get(l.category);
    byCat.set(l.category, {
      label: categoryLabel(l.category) + "s",
      color: CAT_COLOR[l.category] ?? "#999",
      cabezas: (prev?.cabezas ?? 0) + l.headCount,
      kg: (prev?.kg ?? 0) + kg,
      value: (prev?.value ?? 0) + kg * priceFor(l.category),
    });
  }
  const rhythm = CAT_ORDER.filter((c) => byCat.has(c)).map((c) => byCat.get(c)!);

  // Distribución de hacienda (por lote)
  const dist = lots
    .map((l) => ({ name: l.name, category: l.category, cabezas: l.headCount, value: Math.round(l.headCount * l.avgWeight * priceFor(l.category)) }))
    .sort((a, b) => b.value - a.value);
  const distTotal = dist.reduce((a, d) => a + d.value, 0) || 1;

  // Insights
  const sellLot = lots.filter((l) => l.category !== "COW").sort((a, b) => b.avgWeight - a.avgWeight)[0];
  const readyToSell = sellLot && sellLot.avgWeight >= 420 ? sellLot : null;

  // Gastos
  const totalFeed = economy.rows.reduce((a, r) => a + r.feedCost, 0);
  const totalVet = economy.rows.reduce((a, r) => a + r.vetCost, 0);

  return (
    <>
      <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em" }}>
        Buen día, {firstName} <span style={{ fontWeight: 400 }}>🌾</span>
      </p>

      {/* Valor estimado: a ancho completo arriba, para que ambas columnas arranquen alineadas debajo */}
      <div style={{ marginTop: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>Valor estimado del rodeo</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 44, fontWeight: 500, letterSpacing: "-0.02em" }}>{formatARS(totalValue)}</span>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--green)" }}>{Math.round(health.pct)}%</strong> del rodeo en buen ritmo
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 16, marginTop: 18, alignItems: "start" }}>
        {/* Columna izquierda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="grid g3">
            <StatCard label="Cabezas" value={overview.headCount.toLocaleString("es-AR")} sub={`${overview.lotCount} ${overview.lotCount === 1 ? "lote" : "lotes"}`} />
            <StatCard label="GDP promedio" value={`${gdpFmt(overview.avgGdp)} kg/d`} sub="ganancia diaria" up />
            <StatCard label="Conversión" value={overview.conversion !== null ? `${gdpFmt(overview.conversion)} :1` : "—"} sub="kg MS / kg" />
          </div>

          <RhythmPanel items={rhythm} />

          {/* Distribución de hacienda */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>Distribución de hacienda</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)", border: "1px solid var(--border)", borderRadius: 9, padding: "6px 10px" }}>
                  <IconSearch size={13} /> Buscar
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 9, padding: "6px 10px" }}>
                  <IconDownload size={13} /> Exportar
                </span>
              </div>
            </div>
            {dist.length === 0 ? (
              <div style={{ padding: 20 }}><div className="empty">Sin lotes para esta categoría.</div></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Categoría</th>
                    <th className="num">Cabezas</th>
                    <th style={{ width: "32%" }}>Participación</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dist.map((d) => {
                    const pct = Math.round((d.value / distTotal) * 100);
                    return (
                      <tr key={d.name}>
                        <td style={{ fontWeight: 500 }}>{d.name}</td>
                        <td><span className={`pill ${pillClass(d.category)}`}>{categoryLabel(d.category)}</span></td>
                        <td className="num">{d.cabezas}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="track" style={{ flex: 1 }}>
                              <span style={{ width: `${pct}%`, background: CAT_COLOR[d.category] ?? "var(--olive)" }} />
                            </div>
                            <span style={{ fontSize: 12, color: "var(--text-secondary)", width: 34, textAlign: "right" }}>{pct}%</span>
                          </div>
                        </td>
                        <td className="num">{formatARS(d.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          {/* Insight */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--olive)", color: "#f4f1e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconSparkles size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Resumen semanal</p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>Generado a partir de tus datos</p>
              </div>
            </div>
            <div className="grid g2">
              <InsightTile kicker="Alerta" text={health.lowGain > 0 ? `${health.lowGain} animales sin progreso este período` : "Sin alertas de progreso esta semana"} />
              <InsightTile kicker="Consejo" text={readyToSell ? `${readyToSell.name} supera 420 kg: conviene vender` : "Conversión estable, mantené la dieta"} />
            </div>
          </div>

          {/* Salud del rodeo */}
          <div className="card">
            <span style={{ fontSize: 15, fontWeight: 500 }}>Salud del rodeo</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <span className="pill" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>En buen ritmo</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 500, letterSpacing: "-0.01em" }}>
                  {health.onTrack}
                  <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 400 }}> / {health.total}</span>
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>con GDP saludable</p>
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--text-tertiary)", maxWidth: 150, lineHeight: 1.5 }}>
                  Según el último par de pesajes de cada animal de engorde.
                </p>
              </div>
              <Gauge value={health.pct} size={168} />
            </div>
          </div>

          {/* Principales gastos */}
          <div className="card">
            <span style={{ fontSize: 15, fontWeight: 500 }}>Principales gastos</span>
            <div className="grid g2" style={{ marginTop: 12 }}>
              <ExpenseTile name="Alimento" detail="Ración mixer · 90 días" amount={totalFeed} color="var(--olive)" />
              <ExpenseTile name="Veterinaria" detail="Sanidad acumulada" amount={totalVet} color="var(--lav)" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, sub, up }: { label: string; value: string; sub: string; up?: boolean }) {
  return (
    <div className="mcard">
      <p className="label">{label}</p>
      <p className="value">{value}</p>
      <p className="sub" style={up ? { color: "var(--green)", display: "flex", alignItems: "center", gap: 3 } : undefined}>
        {up && <IconArrowUpRight size={12} />} {sub}
      </p>
    </div>
  );
}

function InsightTile({ kicker, text }: { kicker: string; text: string }) {
  return (
    <div style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)", padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{kicker}</span>
        <span style={{ color: "var(--text-tertiary)", display: "flex" }}><IconArrowUpRight size={13} /></span>
      </div>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, lineHeight: 1.4 }}>{text}</p>
    </div>
  );
}

function ExpenseTile({ name, detail, amount, color }: { name: string; detail: string; amount: number; color: string }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: color, marginBottom: 10 }} />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{name}</p>
      <p style={{ margin: "1px 0 8px", fontSize: 11, color: "var(--text-tertiary)" }}>{detail}</p>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{formatARS(amount)}</p>
    </div>
  );
}
