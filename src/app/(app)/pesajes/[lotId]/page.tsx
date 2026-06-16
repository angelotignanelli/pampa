import Link from "next/link";
import { getLotWeighingRows } from "@/lib/queries";
import { categoryLabel } from "@/lib/domain";
import { pillClass } from "@/lib/cat";
import { DataTable, type Column, type Row } from "@/components/DataTable";
import { IconArrowLeft, IconPlus } from "@/components/icons";
import { LinkSpinner } from "@/components/LinkSpinner";

const COLUMNS: Column[] = [
  { key: "caravana", label: "Caravana" },
  { key: "ant", label: "Anterior", fmt: "int", align: "right" },
  { key: "act", label: "Actual", fmt: "int", align: "right" },
  { key: "delta", label: "Δ kg", fmt: "delta", align: "right" },
  { key: "gdp", label: "GDP", fmt: "gdp", align: "right" },
];

export default async function LotePesajesPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const lot = await getLotWeighingRows(lotId);

  if (!lot) {
    return (
      <div>
        <Link href="/pesajes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
          <IconArrowLeft size={14} /> Volver a Pesajes <LinkSpinner />
        </Link>
        <div className="empty">Lote no encontrado.</div>
      </div>
    );
  }

  const alerts = lot.rows.filter((r) => r.gdp !== null && r.gdp < 0.4).length;
  const rows: Row[] = lot.rows.map((r) => ({
    caravana: r.tag,
    ant: r.prevKg,
    act: r.currKg,
    delta: r.delta,
    gdp: r.gdp,
  }));

  return (
    <>
      <Link href="/pesajes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Volver a Pesajes
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="section-title" style={{ margin: 0 }}>{lot.lotName}</h2>
          <span className={`pill ${pillClass(lot.category)}`}>{categoryLabel(lot.category)}</span>
        </div>
        <Link href="/pesajes/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nuevo pesaje</Link>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="mcard"><p className="label">Animales</p><p className="value" style={{ fontSize: 20 }}>{lot.rows.length}</p></div>
        <div className="mcard"><p className="label">Sin progreso</p><p className="value" style={{ fontSize: 20, color: alerts > 0 ? "var(--warning-text)" : undefined }}>{alerts}</p></div>
        <div className="mcard"><p className="label">Con datos</p><p className="value" style={{ fontSize: 20 }}>{lot.rows.filter((r) => r.gdp !== null).length}</p></div>
      </div>

      <DataTable columns={COLUMNS} rows={rows} searchKeys={["caravana"]} searchPlaceholder="Buscar caravana…" pageSize={15} emptyText="Este lote no tiene animales cargados." />
    </>
  );
}
