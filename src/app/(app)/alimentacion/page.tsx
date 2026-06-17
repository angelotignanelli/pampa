import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getRations } from "@/lib/queries";
import { formatKg, formatARS } from "@/lib/domain";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { CatFilter } from "@/components/CatFilter";
import { IconPlus } from "@/components/icons";

const COLUMNS: Column[] = [
  { key: "lote", label: "Lote" },
  { key: "cat", label: "Categoría", fmt: "cat" },
  { key: "fecha", label: "Vigente desde", fmt: "date" },
  { key: "racionDia", label: "Ración/día", fmt: "kg", align: "right" },
  { key: "racionAnimal", label: "Kg/animal", fmt: "kg1", align: "right" },
  { key: "ms", label: "MS/animal", fmt: "pct", align: "right" },
  { key: "costoDia", label: "Costo/día", fmt: "ars", align: "right" },
  { key: "gdp", label: "GDP", fmt: "gdp", align: "right" },
];

export default async function AlimentacionPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat = parseCat((await searchParams).cat);
  const rations = await getRations(cat);

  // Consumo acumulado por alimento (kg entregados desde que arrancó cada receta vigente).
  const accByFood = new Map<string, number>();
  let accTotal = 0;
  for (const r of rations) {
    for (const it of r.items) {
      const kg = (it.percentage / 100) * r.kgPerDay * r.daysInFeedlot;
      accByFood.set(it.name, (accByFood.get(it.name) ?? 0) + kg);
      accTotal += kg;
    }
  }
  const foods = [...accByFood.entries()].sort((a, b) => b[1] - a[1]);

  const rows: Row[] = rations.map((r) => ({
    href: `/alimentacion/${r.lotId}`,
    lote: r.lotName,
    cat: r.category,
    fecha: r.effectiveFrom,
    racionDia: r.kgPerDay,
    racionAnimal: Math.round(r.kgPerHeadDay * 10) / 10,
    ms: r.dmiBodyWeightPct,
    costoDia: Math.round(r.costPerDay * r.headCount), // costo diario del lote
    gdp: r.gdp > 0 ? r.gdp : null,
  }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Alimentación</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            {rations.length} {rations.length === 1 ? "receta vigente" : "recetas vigentes"} · elegí un lote para ver la composición del mixer
          </p>
        </div>
        <Link href="/alimentacion/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nueva receta</Link>
      </div>

      <CatFilter />

      {rations.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
            Consumo acumulado de alimento
          </div>
          <div className="grid g4" style={{ gap: 12, padding: 14 }}>
            {foods.map(([name, kg]) => (
              <div key={name} className="mcard">
                <p className="label">{name}</p>
                <p className="value" style={{ fontSize: 18 }}>{formatKg(Math.round(kg))}</p>
              </div>
            ))}
            <div className="mcard" style={{ background: "var(--bg-secondary)" }}>
              <p className="label">Total ración</p>
              <p className="value" style={{ fontSize: 18 }}>{formatKg(Math.round(accTotal))}</p>
            </div>
          </div>
          <div style={{ padding: "8px 14px", fontSize: 11, color: "var(--text-tertiary)", borderTop: "1px solid var(--border)" }}>
            Total entregado desde el inicio de cada receta vigente, asumiendo la ración diaria constante.
          </div>
        </div>
      )}

      <DataTable
        columns={COLUMNS}
        rows={rows}
        searchKeys={["lote"]}
        searchPlaceholder="Buscar lote…"
        pageSize={12}
        emptyText="No hay recetas para esta categoría."
      />
    </>
  );
}
