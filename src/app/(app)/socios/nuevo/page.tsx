import { createOwner } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";

export default function NuevoSocioPage() {
  return (
    <FormPage title="Nuevo socio" backHref="/socios">
      <form action={createOwner} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nombre del socio">
          <input name="name" required placeholder="Ej. Sofía Gómez" style={fieldStyle} />
        </Field>
        <Field label="Participación global (%)" hint="Se aplica a todos los lotes que no tengan un reparto propio.">
          <input name="globalPct" type="number" min="0" max="100" defaultValue="0" style={fieldStyle} />
        </Field>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Ajustá los porcentajes de modo que entre todos los socios sumen 100%. Después podés fijar un reparto distinto en cada lote.
        </p>
        <FormActions submitLabel="Agregar socio" />
      </form>
    </FormPage>
  );
}
