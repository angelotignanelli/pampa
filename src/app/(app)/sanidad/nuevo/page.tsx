import { prisma } from "@/lib/prisma";
import { createTreatment } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel, TREATMENT_TYPES } from "@/lib/domain";

export default async function NuevoTratamientoPage() {
  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Nuevo tratamiento" backHref="/sanidad">
      <form action={createTreatment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Lote">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
            ))}
          </select>
        </Field>
        <Field label="Tratamiento">
          <input name="name" required placeholder="Vacuna aftosa" style={fieldStyle} />
        </Field>
        <Field label="Tipo">
          <select name="type" style={fieldStyle} defaultValue="VACCINE">
            {Object.entries(TREATMENT_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Fecha">
          <input name="date" type="date" defaultValue={today} style={fieldStyle} />
        </Field>
        <Field label="Estado">
          <select name="status" style={fieldStyle} defaultValue="SCHEDULED">
            <option value="SCHEDULED">Programada</option>
            <option value="PENDING">Pendiente</option>
            <option value="DONE">Aplicada</option>
          </select>
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Carencia (días)">
            <input name="withdrawalDays" type="number" min="0" defaultValue="0" style={fieldStyle} />
          </Field>
          <Field label="Costo total (ARS)">
            <input name="cost" type="number" min="0" defaultValue="0" style={fieldStyle} />
          </Field>
        </div>
        <FormActions submitLabel="Registrar tratamiento" />
      </form>
    </FormPage>
  );
}
