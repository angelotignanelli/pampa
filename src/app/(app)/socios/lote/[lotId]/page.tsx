import { prisma } from "@/lib/prisma";
import { getOwners } from "@/lib/queries";
import { setLotShares } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel } from "@/lib/domain";

export default async function LoteSharesPage({ params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  const [lot, owners, shares] = await Promise.all([
    prisma.lot.findUnique({ where: { id: lotId } }),
    getOwners(),
    prisma.share.findMany(),
  ]);

  if (!lot) {
    return (
      <FormPage title="Participación por lote" backHref="/socios">
        <div className="empty">Lote no encontrado.</div>
      </FormPage>
    );
  }
  if (owners.length === 0) {
    return (
      <FormPage title="Participación por lote" backHref="/socios">
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Primero agregá socios.</p>
      </FormPage>
    );
  }

  const lotPct = new Map(shares.filter((s) => s.lotId === lotId).map((s) => [s.ownerId, s.sharePct]));
  const globalPct = new Map(shares.filter((s) => s.lotId === null).map((s) => [s.ownerId, s.sharePct]));
  const prefill = (ownerId: string) => lotPct.get(ownerId) ?? globalPct.get(ownerId) ?? 0;

  return (
    <FormPage title={`Reparto · ${lot.name}`} backHref="/socios">
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
        {categoryLabel(lot.category)} · definí el % de cada socio en este lote. Si dejás todo en 0 vuelve a usar la participación global.
      </p>
      <form action={setLotShares} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="lotId" value={lotId} />
        {owners.map((o) => (
          <Field key={o.id} label={o.name}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input name={`share_${o.id}`} type="number" min="0" max="100" defaultValue={prefill(o.id)} style={{ ...fieldStyle, width: 110 }} />
              <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>%</span>
            </div>
          </Field>
        ))}
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)" }}>Los porcentajes deberían sumar 100%.</p>
        <FormActions submitLabel="Guardar reparto" />
      </form>
    </FormPage>
  );
}
