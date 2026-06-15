import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getTreatments } from "@/lib/queries";
import { formatARS } from "@/lib/domain";
import { IconPlus } from "@/components/icons";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DONE: { bg: "var(--success-bg)", color: "var(--success-text)", label: "Aplicada" },
  PENDING: { bg: "var(--warning-bg)", color: "var(--warning-text)", label: "Pendiente" },
  SCHEDULED: { bg: "var(--bg-secondary)", color: "var(--text-secondary)", label: "Programada" },
};

export default async function SanidadPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const cat = parseCat((await searchParams).cat);
  const treatments = await getTreatments(cat);
  const totalCost = treatments.reduce((a, t) => a + t.cost, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Sanidad</h2>
        <Link href="/sanidad/nuevo" className="btn"><IconPlus size={14} /> Nuevo tratamiento</Link>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="mcard">
          <p className="label">Tratamientos registrados</p>
          <p className="value" style={{ fontSize: 18 }}>{treatments.length}</p>
          <p className="sub">categoría actual</p>
        </div>
        <div className="mcard">
          <p className="label">Gasto veterinario</p>
          <p className="value" style={{ fontSize: 18 }}>{formatARS(totalCost)}</p>
          <p className="sub">acumulado</p>
        </div>
        <div className="mcard">
          <p className="label">Mortandad (año)</p>
          <p className="value" style={{ fontSize: 18 }}>1,3%</p>
          <p className="sub" style={{ color: "var(--success-text)" }}>bajo el umbral</p>
        </div>
      </div>

      {treatments.length === 0 ? (
        <div className="empty">No hay tratamientos cargados para esta categoría.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", borderBottom: "0.5px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
            Calendario sanitario
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tratamiento</th>
                <th>Lote</th>
                <th>Carencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {treatments.map((t) => {
                const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.SCHEDULED;
                return (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}</td>
                    <td>{t.name}</td>
                    <td>{t.lotName}</td>
                    <td>{t.withdrawalDays > 0 ? `${t.withdrawalDays} días` : "—"}</td>
                    <td>
                      <span className="pill" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        Cada tratamiento guarda su período de carencia: la plataforma avisa cuándo el animal se puede vender o faenar.
      </p>
    </>
  );
}
