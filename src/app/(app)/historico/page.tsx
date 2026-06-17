import Link from "next/link";
import { getSeasonsWithSummary } from "@/lib/queries";
import { formatARS } from "@/lib/domain";
import { IconPlus, IconHistory } from "@/components/icons";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
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

export default async function HistoricoPage() {
  const seasons = await getSeasonsWithSummary();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Histórico del campo</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            Cada campaña agrupa lo que pasó en el campo. Los datos quedan guardados aunque cambien los precios o los socios.
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
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>{fmtDate(s.startDate)} — {fmtDate(s.endDate)}</p>
                </div>
                {s.isCurrent && <span className="pill" style={{ background: "var(--success-bg)", color: "var(--success-text)" }}>actual</span>}
                {s.closed && <span className="pill" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>cerrada</span>}
              </div>
              <div className="grid g4" style={{ gap: 12, padding: 14 }}>
                <Metric label="Pesajes" value={s.weighings.toLocaleString("es-AR")} sub="registrados" />
                <Metric label="Tratamientos" value={s.treatments.toLocaleString("es-AR")} sub="sanidad" />
                <Metric label="Compras" value={`${s.purchases.qty} cab`} sub={s.purchases.amount > 0 ? formatARS(s.purchases.amount) : "—"} />
                <Metric label="Ventas" value={`${s.sales.qty} cab`} sub={s.sales.amount > 0 ? formatARS(s.sales.amount) : "—"} />
                <Metric label="Nacimientos" value={s.births.toLocaleString("es-AR")} sub="terneros" />
                <Metric label="Muertes" value={s.deaths.toLocaleString("es-AR")} sub="bajas" />
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        Próximo paso del histórico: el cierre de campaña, que congela los números clave (stock, valor, costos y reparto por socio) para comparar año contra año.
      </p>
    </>
  );
}
