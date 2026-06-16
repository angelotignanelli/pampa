import Link from "next/link";
import { parseCat, pillClass } from "@/lib/cat";
import { getEconomy, getOverview, getLots, getOwnerSplit } from "@/lib/queries";
import { getSession, canManage } from "@/lib/auth";
import { formatARS, formatKg, categoryLabel } from "@/lib/domain";
import { IconBell, IconUsers } from "@/components/icons";
import { SetPriceButton } from "@/components/SetPriceButton";

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
  const [{ rows, prices }, overview, lots, split, user] = await Promise.all([
    getEconomy(cat),
    getOverview(cat),
    getLots(cat),
    getOwnerSplit(cat),
    getSession(),
  ]);
  const editable = canManage(user?.role ?? "WORKER");

  const fattening = lots.filter((l) => l.category !== "COW");
  const sellReady = fattening.find((l) => l.avgWeight >= 420);
  // Para el encabezado (cuando se ven todas las categorías) tomamos el novillo como referencia.
  const headCat = cat === "ALL" ? "STEER" : cat;
  const salePrice = prices.byCat[headCat];
  const marginPerKg = overview.costPerKg !== null ? salePrice - overview.costPerKg : null;

  const ORIGIN_LABEL: Record<string, string> = {
    MAG_CANUELAS: "Mercado de Cañuelas",
    MANUAL: "fijado a mano",
    DEFAULT: "estimado (sin dato de mercado)",
  };
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }) : null;
  const refDateFmt = fmtDate(prices.refDate);
  const lastOkFmt = fmtDate(prices.lastOkAt);
  const shownCats = (cat === "ALL" ? (["STEER", "COW", "CALF"] as const) : [headCat]).filter(
    (c) => prices.byCat[c] !== undefined,
  );
  const anyFailing = shownCats.some((c) => prices.failing[c]);

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
          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-tertiary)" }}>
            {categoryLabel(headCat)} · {ORIGIN_LABEL[prices.origin[headCat]]}
          </p>
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

      <div className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Precios de mercado · $/kg vivo</span>
          <a href={prices.source.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {prices.source.name} ↗
          </a>
        </div>
        {anyFailing && (
          <div style={{ padding: "9px 14px", background: "var(--warn-bg, #fcf3e3)", color: "var(--warn-text, #8a5a12)", fontSize: 12, borderBottom: "1px solid var(--border)" }}>
            ⚠ No pudimos traer la última cotización de {prices.source.name}. Estás viendo el último valor guardado
            {lastOkFmt ? ` (actualizado por última vez el ${lastOkFmt})` : ""}. Podés fijar un precio a mano abajo.
          </div>
        )}
        <table className="data-table">
          <thead>
            <tr>
              <th>Categoría</th>
              <th className="numl">Precio / kg</th>
              <th>Origen</th>
              {editable && <th aria-label="" />}
            </tr>
          </thead>
          <tbody>
            {shownCats.map((c) => (
              <tr key={c}>
                <td><span className={`pill ${pillClass(c)}`}>{categoryLabel(c)}</span></td>
                <td className="numl" style={{ fontWeight: 500 }}>{formatARS(prices.byCat[c])}</td>
                <td style={{ fontSize: 12, color: prices.failing[c] ? "var(--warn-text, #8a5a12)" : "var(--text-secondary)" }}>
                  {prices.failing[c]
                    ? `⚠ No se pudo actualizar — mostrando último valor${lastOkFmt ? ` (${lastOkFmt})` : ""}`
                    : ORIGIN_LABEL[prices.origin[c]]}
                </td>
                {editable && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <SetPriceButton category={c} currentPrice={prices.byCat[c]} isManual={prices.origin[c] === "MANUAL"} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--text-tertiary)", borderTop: "1px solid var(--border)" }}>
          {refDateFmt ? `Cotización del ${refDateFmt}, actualizada a diario en forma automática. ` : "Sin cotización automática todavía. "}
          Los terneros no cotizan en Cañuelas (mercado de invernada): se usa un valor estimado hasta sumar Rosgan.
          {editable ? " Podés fijar un precio a mano por categoría (0 = volver al automático)." : ""}
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
