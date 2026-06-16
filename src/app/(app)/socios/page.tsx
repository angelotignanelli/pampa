import Link from "next/link";
import { getOwnerSplit } from "@/lib/queries";
import { formatARS, formatKg, categoryLabel } from "@/lib/domain";
import { pillClass } from "@/lib/cat";
import { IconPlus, IconEdit } from "@/components/icons";

export default async function SociosPage() {
  const split = await getOwnerSplit();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Socios</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-tertiary)" }}>
            Reparto de la hacienda según la participación de cada socio · {formatKg(split.totalKg)} en total
          </p>
        </div>
        <Link href="/socios/nuevo" className="btn btn-primary"><IconPlus size={14} /> Nuevo socio</Link>
      </div>

      {split.owners.length === 0 ? (
        <div className="empty">Todavía no cargaste socios. Agregá uno para repartir la hacienda.</div>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${Math.min(split.owners.length, 4)}, 1fr)`, marginBottom: 16 }}>
            {split.owners.map((o) => (
              <div key={o.id} className="card">
                <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 500 }}>{o.name}</p>
                <p style={{ margin: "0 0 12px", fontSize: 11, color: "var(--text-tertiary)" }}>
                  {o.globalPct !== null ? `Participación global ${o.globalPct}%` : "Sin participación global"}
                </p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>{formatKg(o.kg)}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>de carne · {formatARS(o.valueShare)}</p>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 500 }}>
              Reparto por lote
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Categoría</th>
                  <th className="num">Kg total</th>
                  <th>Reparto entre socios</th>
                  <th style={{ width: 70 }} aria-label="" />
                </tr>
              </thead>
              <tbody>
                {split.lots.map((l) => (
                  <tr key={l.lotId}>
                    <td style={{ fontWeight: 500 }}>
                      {l.lotName}
                      {l.custom && (
                        <span className="pill" style={{ background: "var(--info-bg)", color: "var(--info-text)", marginLeft: 8 }}>personalizado</span>
                      )}
                    </td>
                    <td><span className={`pill ${pillClass(l.category)}`}>{categoryLabel(l.category)}</span></td>
                    <td className="num">{formatKg(l.kg)}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {l.parts.length === 0 ? (
                          <span style={{ color: "var(--text-tertiary)" }}>Sin asignar</span>
                        ) : (
                          l.parts.map((p) => (
                            <span key={p.ownerId} style={{ fontSize: 12 }}>
                              {p.name} <span style={{ color: "var(--text-tertiary)" }}>{p.pct}%</span> · {formatKg(p.kg)}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/socios/lote/${l.lotId}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                        <IconEdit size={13} /> Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--text-tertiary)" }}>
            Cada lote usa la participación global salvo que tenga un reparto propio (“personalizado”). Editá un lote para fijar porcentajes específicos.
          </p>
        </>
      )}
    </>
  );
}
