import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getExpenses } from "@/lib/queries";
import { formatARS, EXPENSE_CATEGORIES } from "@/lib/domain";
import { CatFilter } from "@/components/CatFilter";
import { IconPlus, IconArrowLeft } from "@/components/icons";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });

export default async function GastosPage({ searchParams }: { searchParams: Promise<{ cat?: string; season?: string }> }) {
  const sp = await searchParams;
  const cat = parseCat(sp.cat);
  const readOnly = !!sp.season;
  const q = sp.season ? `?season=${sp.season}` : "";
  const expenses = await getExpenses(cat, sp.season);
  const total = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <>
      <Link href={`/sanidad${q}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Volver a Sanidad
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Gastos</h2>
        {!readOnly && <Link href="/sanidad/gasto/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nuevo gasto</Link>}
      </div>

      <CatFilter />

      {expenses.length === 0 ? (
        <div className="empty">Sin gastos cargados.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
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
              <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 600 }}>
                <td colSpan={4}>Total</td>
                <td className="num">{formatARS(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
