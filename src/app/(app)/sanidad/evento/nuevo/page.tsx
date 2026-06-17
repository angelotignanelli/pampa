import { prisma } from "@/lib/prisma";
import { createHerdEvent } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel, EVENT_TYPES } from "@/lib/domain";

export default async function NuevoEventoPage() {
  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Nuevo evento de manejo" backHref="/sanidad">
      <form action={createHerdEvent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Tipo de evento">
            <select name="type" required style={fieldStyle} defaultValue="VACCINATION">
              {Object.entries(EVENT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input name="date" type="date" defaultValue={today} style={fieldStyle} />
          </Field>
        </div>

        <Field label="Lote">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Cabezas" hint="Cuántos animales abarcó (opcional).">
            <input name="headCount" type="number" min="0" placeholder="54" style={fieldStyle} />
          </Field>
          <Field label="Dato / resultado" hint="Tacto → % preñez · Destete → kg prom · Vacuna → dosis.">
            <input name="value" type="number" step="0.1" min="0" placeholder="—" style={fieldStyle} />
          </Field>
        </div>

        <Field label="Nota" hint="Detalle libre: producto usado, observaciones, etc.">
          <input name="note" placeholder="Ej. Vacuna aftosa, lote completo" style={fieldStyle} />
        </Field>

        <FormActions submitLabel="Guardar evento" />
      </form>
    </FormPage>
  );
}
