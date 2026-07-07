import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getHerdEvents } from "@/lib/queries";
import { EVENT_TYPES } from "@/lib/domain";
import { CatFilter } from "@/components/CatFilter";
import { IconPlus, IconArrowLeft } from "@/components/icons";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "2-digit" });

export default async function EventosPage({ searchParams }: { searchParams: Promise<{ cat?: string; season?: string }> }) {
  const sp = await searchParams;
  const cat = parseCat(sp.cat);
  const readOnly = !!sp.season;
  const q = sp.season ? `?season=${sp.season}` : "";
  const events = await getHerdEvents(cat, sp.season);

  return (
    <>
      <Link href={`/sanidad${q}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
        <IconArrowLeft size={14} /> Volver a Sanidad
      </Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Eventos de manejo</h2>
        {!readOnly && <Link href="/sanidad/evento/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nuevo evento</Link>}
      </div>

      <CatFilter />

      {events.length === 0 ? (
        <div className="empty">Sin eventos. Cargá vacunaciones, tactos, destetes, etc.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Evento</th><th>Lote</th><th className="num">Cabezas</th><th className="num">Dato</th><th>Nota</th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>{fmtDate(e.date)}</td>
                  <td style={{ fontWeight: 500 }}>{EVENT_TYPES[e.type as keyof typeof EVENT_TYPES] ?? e.type}</td>
                  <td>{e.lotName}</td>
                  <td className="num">{e.headCount ?? "—"}</td>
                  <td className="num">{e.value ?? "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{e.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
        El &quot;dato&quot; depende del evento: % de preñez en el tacto, kg promedio en el destete, dosis en la vacuna.
      </p>
    </>
  );
}
