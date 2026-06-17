import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getTreatments, getHerdEvents, getExpenses } from "@/lib/queries";
import { formatARS, EVENT_TYPES, EXPENSE_CATEGORIES } from "@/lib/domain";
import { CatFilter } from "@/components/CatFilter";
import { IconPlus } from "@/components/icons";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DONE: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Aplicada" },
  PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pendiente" },
  SCHEDULED: { bg: "var(--bg-secondary)", color: "var(--text-secondary)", label: "Programada" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "0.5px solid var(--border)" }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export default async function SanidadPage({ searchParams }: { searchParams: Promise<{ cat?: string; season?: string }> }) {
  const sp = await searchParams;
  const cat = parseCat(sp.cat);
  const [treatments, events, expenses] = await Promise.all([
    getTreatments(cat, sp.season),
    getHerdEvents(cat, sp.season),
    getExpenses(cat, sp.season),
  ]);
  const sanitExpenses = expenses.filter((e) => e.category === "SANIDAD");
  const totalVet = treatments.reduce((a, t) => a + t.cost, 0) + sanitExpenses.reduce((a, e) => a + e.amount, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Sanidad y manejo</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/sanidad/evento/nuevo" className="btn"><IconPlus size={14} /> Evento</Link>
          <Link href="/sanidad/gasto/nuevo" className="btn"><IconPlus size={14} /> Gasto</Link>
          <Link href="/sanidad/nuevo" className="btn btn-primary"><IconPlus size={14} /> Tratamiento</Link>
        </div>
      </div>

      <CatFilter />

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="mcard">
          <p className="label">Tratamientos</p>
          <p className="value" style={{ fontSize: 18 }}>{treatments.length}</p>
          <p className="sub">categoría actual</p>
        </div>
        <div className="mcard">
          <p className="label">Gasto veterinario</p>
          <p className="value" style={{ fontSize: 18 }}>{formatARS(totalVet)}</p>
          <p className="sub">tratamientos + gastos</p>
        </div>
        <div className="mcard">
          <p className="label">Eventos de manejo</p>
          <p className="value" style={{ fontSize: 18 }}>{events.length}</p>
          <p className="sub">vacunación, tacto, destete…</p>
        </div>
      </div>

      {/* Calendario sanitario */}
      <SectionCard title="Calendario sanitario">
        {treatments.length === 0 ? (
          <div style={{ padding: 18 }}><div className="empty">No hay tratamientos cargados.</div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Tratamiento</th><th>Lote</th><th>Carencia</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {treatments.map((t) => {
                const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.SCHEDULED;
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.name}</td>
                    <td>{t.lotName}</td>
                    <td>{t.withdrawalDays > 0 ? `${t.withdrawalDays} días` : "—"}</td>
                    <td><span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Eventos de manejo */}
      <SectionCard title="Eventos de manejo">
        {events.length === 0 ? (
          <div style={{ padding: 18 }}><div className="empty">Sin eventos. Cargá vacunaciones, tactos, destetes, etc.</div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Evento</th><th>Lote</th><th className="num">Cabezas</th><th className="num">Dato</th><th>Nota</th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td>{EVENT_TYPES[e.type as keyof typeof EVENT_TYPES] ?? e.type}</td>
                  <td>{e.lotName}</td>
                  <td className="num">{e.headCount ?? "—"}</td>
                  <td className="num">{e.value ?? "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{e.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Gastos */}
      <SectionCard title="Gastos">
        {expenses.length === 0 ? (
          <div style={{ padding: 18 }}><div className="empty">Sin gastos cargados.</div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Lote</th><th className="num">Monto</th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td>{EXPENSE_CATEGORIES[e.category as keyof typeof EXPENSE_CATEGORIES] ?? e.category}</td>
                  <td style={{ fontWeight: 500 }}>{e.concept}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{e.lotName ?? "Establecimiento"}</td>
                  <td className="num">{formatARS(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        Los tratamientos guardan su período de carencia (cuándo se puede vender/faenar). Los gastos de sanidad se reflejan en el costo veterinario de Economía.
      </p>
    </>
  );
}
