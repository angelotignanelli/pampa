import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getRations } from "@/lib/queries";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { IconPlus } from "@/components/icons";

const COLUMNS: Column[] = [
  { key: "lote", label: "Lote" },
  { key: "cat", label: "Categoría", fmt: "cat" },
  { key: "receta", label: "Receta" },
  { key: "racion", label: "Ración/día", fmt: "kg", align: "right" },
  { key: "ms", label: "MS", fmt: "pct", align: "right" },
  { key: "conv", label: "Conversión", fmt: "gdp", align: "right" },
  { key: "costo", label: "Costo/día", fmt: "ars", align: "right" },
];

export default async function AlimentacionPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat = parseCat((await searchParams).cat);
  const rations = await getRations(cat);

  const rows: Row[] = rations.map((r) => ({
    href: `/alimentacion/${r.lotId}`,
    lote: r.lotName,
    cat: r.category,
    receta: r.name,
    racion: r.kgPerHeadDay,
    ms: r.dryMatterPct,
    conv: r.conversion > 0 ? r.conversion : null,
    costo: r.costPerDay,
  }));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Alimentación</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            {rations.length} {rations.length === 1 ? "receta" : "recetas"} · elegí un lote para ver la composición del mixer
          </p>
        </div>
        <Link href="/alimentacion/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nueva receta</Link>
      </div>

      <DataTable columns={COLUMNS} rows={rows} searchKeys={["lote", "receta"]} searchPlaceholder="Buscar lote o receta…" pageSize={12} emptyText="No hay recetas para esta categoría." />
    </>
  );
}
