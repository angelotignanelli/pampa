import Link from "next/link";
import { getSeasonsWithSummary, getExitedAnimals, type SeasonSummary } from "@/lib/queries";
import { getSession, canManage } from "@/lib/auth";
import { closeSeason } from "@/lib/actions/crud";
import { formatARS } from "@/lib/domain";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { SubmitButton } from "@/components/SubmitButton";
import { IconPlus, IconHistory } from "@/components/icons";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}
function compactARS(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}k`;
  return formatARS(n);
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="mcard">
      <p className="label">{label}</p>
      <p className="value" style={{ fontSize: 18 }}>{value}</p>
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}

const EXIT_COLUMNS: Column[] = [
  { key: "caravana", label: "Caravana" },
  { key: "lote", label: "Lote" },
  { key: "cat", label: "Categoría", fmt: "cat" },
  { key: "motivo", label: "Motivo" },
  { key: "fecha", label: "Fecha", fmt: "date" },
  { key: "peso", label: "Peso salida", fmt: "kg", align: "right" },
  { key: "valor", label: "Venta", fmt: "ars", align: "right" },
];

function ClosedBody({ close }: { close: NonNullable<SeasonSummary["close"]> }) {
  return (
    <div style={{ padding: 14 }}>
      <div className="grid g4" style={{ gap: 12 }}>
        <Metric label="Cabezas" value={close.headCount.toLocaleString("es-AR")} sub="al cierre" />
        <Metric label="Valor del rodeo" value={compactARS(close.herdValue)} sub="estimado" />
        <Metric label="Ventas" value={`${close.salesQty} cab`} sub={close.salesAmount > 0 ? compactARS(close.salesAmount) : "—"} />
        <Metric label="Compras" value={`${close.purchasesQty} cab`} sub={close.purchasesAmount > 0 ? compactARS(close.purchasesAmount) : "—"} />
        <Metric label="Costo alimentación" value={compactARS(close.feedCost)} />
        <Metric label="Costo veterinario" value={compactARS(close.vetCost)} />
        <Metric label="Margen repartible" value={compactARS(close.margin)} />
        <Metric label="Kg vivos" value={`${close.totalKg.toLocaleString("es-AR")} kg`} />
      </div>
      {close.ownerSplit.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-secondary)" }}>
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>Reparto por socio (congelado): </span>
          {close.ownerSplit.map((o, i) => (
            <span key={o.name}>
              {i > 0 ? " · " : ""}
              {o.name} {o.kg.toLocaleString("es-AR")} kg ({compactARS(o.value)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function OpenBody({ s, editable }: { s: SeasonSummary; editable: boolean }) {
  return (
    <>
      <div className="grid g4" style={{ gap: 12, padding: 14 }}>
        <Metric label="Pesajes" value={s.weighings.toLocaleString("es-AR")} sub="registrados" />
        <Metric label="Tratamientos" value={s.treatments.toLocaleString("es-AR")} sub="sanidad" />
        <Metric label="Compras" value={`${s.purchases.qty} cab`} sub={s.purchases.amount > 0 ? compactARS(s.purchases.amount) : "—"} />
        <Metric label="Ventas" value={`${s.sales.qty} cab`} sub={s.sales.amount > 0 ? compactARS(s.sales.amount) : "—"} />
        <Metric label="Nacimientos" value={s.births.toLocaleString("es-AR")} sub="terneros" />
        <Metric label="Muertes" value={s.deaths.toLocaleString("es-AR")} sub="bajas" />
      </div>
      {editable && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 14px 14px", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-tertiary)", maxWidth: 460, lineHeight: 1.5 }}>
            Al cerrar, los números clave (stock, valor, costos, margen y reparto por socio) quedan congelados con
            los precios de hoy. Sirve para comparar campañas sin que los altere un cambio futuro.
          </span>
          <form action={closeSeason}>
            <input type="hidden" name="seasonId" value={s.id} />
            <SubmitButton label="Cerrar campaña" pendingLabel="Cerrando…" block={false} />
          </form>
        </div>
      )}
    </>
  );
}

export default async function HistoricoPage() {
  const [seasons, exited, user] = await Promise.all([
    getSeasonsWithSummary(),
    getExitedAnimals(),
    getSession(),
  ]);
  const editable = canManage(user?.role ?? "WORKER");

  const exitRows: Row[] = exited.map((a) => ({
    caravana: a.tag,
    lote: a.lotName,
    cat: a.category,
    motivo: a.reason === "SOLD" ? "Vendido" : "Baja",
    fecha: a.date,
    peso: a.weight,
    valor: a.price && a.price > 0 ? a.price : null,
  }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Histórico del campo</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            Cada campaña agrupa lo que pasó en el campo. Al cerrarla, los números quedan guardados aunque cambien los precios o los socios.
          </p>
        </div>
        <Link href="/historico/nueva" className="btn btn-primary"><IconPlus size={14} /> Nueva campaña</Link>
      </div>

      {seasons.length === 0 ? (
        <div className="empty">Todavía no hay campañas. Creá la primera para empezar a guardar el histórico.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {seasons.map((s) => (
            <div key={s.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--olive)" }}><IconHistory size={18} /></span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>{s.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>
                    {fmtDate(s.startDate)} — {fmtDate(s.endDate)}
                    {s.close ? ` · cerrada el ${fmtDate(s.close.closedAt)}` : ""}
                  </p>
                </div>
                {s.isCurrent && <span className="pill" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>actual</span>}
                {s.closed && <span className="pill" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>cerrada</span>}
              </div>
              {s.close ? <ClosedBody close={s.close} /> : <OpenBody s={s} editable={editable} />}
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: "20px 0 10px", fontSize: 15, fontWeight: 500 }}>Animales egresados ({exited.length})</p>
      <DataTable
        columns={EXIT_COLUMNS}
        rows={exitRows}
        searchKeys={["caravana", "lote", "motivo"]}
        searchPlaceholder="Buscar caravana o lote…"
        pageSize={10}
        emptyText="Todavía no hay animales egresados."
      />
    </>
  );
}
