import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getTreatments } from "@/lib/queries";
import { CatFilter } from "@/components/CatFilter";
import { IconPlus, IconArrowLeft } from "@/components/icons";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DONE: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Aplicada" },
  PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pendiente" },
  SCHEDULED: { bg: "var(--bg-secondary)", color: "var(--text-secondary)", label: "Programada" },
};
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });

export default async function TratamientosPage({ searchParams }: { searchParams: Promise<{ cat?: string; season?: string }> }) {
  const sp = await searchParams;
  const cat = parseCat(sp.cat);
  const readOnly = !!sp.season;
  const q = sp.season ? `?season=${sp.season}` : "";
  const treatments = await getTreatments(cat, sp.season);

  return (
    <>
      <Link href={`/sanidad${q}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Volver a Sanidad
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Tratamientos</h2>
        {!readOnly && <Link href="/sanidad/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nuevo tratamiento</Link>}
      </div>

      <CatFilter />

      {treatments.length === 0 ? (
        <div className="empty">No hay tratamientos cargados.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Tratamiento</th><th>Lote</th><th>Carencia</th><th className="num">Costo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {treatments.map((t) => {
                const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.SCHEDULED;
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td style={{ fontWeight: 500 }}>{t.name}</td>
                    <td>{t.lotName}</td>
                    <td>{t.withdrawalDays > 0 ? `${t.withdrawalDays} días` : "—"}</td>
                    <td className="num">{t.cost > 0 ? t.cost.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }) : "—"}</td>
                    <td><span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        Cada tratamiento guarda su período de carencia: cuándo el animal se puede vender o faenar.
      </p>
    </>
  );
}
