import { prisma } from "@/lib/prisma";
import { createMovement } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel, MOVEMENT_TYPES } from "@/lib/domain";

export default async function NuevoMovimientoPage() {
  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Nuevo movimiento" backHref="/lotes">
      <form action={createMovement} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Lote">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo de movimiento">
          <select name="type" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí…</option>
            {Object.entries(MOVEMENT_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Cantidad (cabezas)">
            <input name="quantity" type="number" min="1" required placeholder="20" style={fieldStyle} />
          </Field>
          <Field label="Monto total (ARS)">
            <input name="amount" type="number" min="0" defaultValue="0" style={fieldStyle} />
          </Field>
        </div>
        <Field label="Fecha">
          <input name="date" type="date" defaultValue={today} style={fieldStyle} />
        </Field>
        <Field label="Nota (opcional)">
          <input name="note" placeholder="Compra en remate…" style={fieldStyle} />
        </Field>
        <FormActions submitLabel="Registrar movimiento" />
      </form>
    </FormPage>
  );
}
