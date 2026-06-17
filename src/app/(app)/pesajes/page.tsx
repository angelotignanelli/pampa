import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getLots } from "@/lib/queries";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { IconPlus } from "@/components/icons";

const COLUMNS: Column[] = [
  { key: "lote", label: "Lote" },
  { key: "cat", label: "Categoría", fmt: "cat" },
  { key: "cabezas", label: "Cabezas", fmt: "int", align: "right" },
  { key: "peso", label: "Peso prom.", fmt: "kg", align: "right" },
  { key: "gdp", label: "GDP", fmt: "gdp", align: "right" },
  { key: "ultimo", label: "Último pesaje", fmt: "date" },
];

export default async function PesajesPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat = parseCat((await searchParams).cat);
  const lots = await getLots(cat);

  const rows: Row[] = lots.map((l) => ({
    href: `/pesajes/${l.id}`,
    lote: l.name,
    cat: l.category,
    cabezas: l.headCount,
    peso: l.avgWeight,
    gdp: l.gdp,
    ultimo: l.lastWeighDate,
  }));

  const totalHead = lots.reduce((a, l) => a + l.headCount, 0);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Pesajes</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            {lots.length} {lots.length === 1 ? "lote" : "lotes"} · {totalHead.toLocaleString("es-AR")} cabezas · elegí un lote para ver el detalle por animal
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/pesajes/grupal" className="btn"><IconPlus size={14} /> Pesaje grupal</Link>
          <Link href="/pesajes/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nuevo pesaje</Link>
        </div>
      </div>

      <DataTable columns={COLUMNS} rows={rows} searchKeys={["lote"]} searchPlaceholder="Buscar lote…" pageSize={12} emptyText="No hay lotes para esta categoría." />
    </>
  );
}
