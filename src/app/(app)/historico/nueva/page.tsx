import { createSeason } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";

export default function NuevaCampanaPage() {
  return (
    <FormPage title="Nueva campaña" backHref="/historico">
      <form action={createSeason} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nombre" hint="Ej. Campaña 2025/26, Ejercicio 2026, Engorde verano.">
          <input name="name" required placeholder="Campaña 2025/26" style={fieldStyle} />
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Inicio">
            <input name="startDate" type="date" required style={fieldStyle} />
          </Field>
          <Field label="Fin">
            <input name="endDate" type="date" required style={fieldStyle} />
          </Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
          <input name="isCurrent" type="checkbox" defaultChecked /> Marcar como campaña actual
        </label>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          La campaña puede ser el año calendario o tu propio ciclo (ejercicio fiscal, engorde). Los pesajes,
          tratamientos y movimientos que caigan entre estas fechas se agrupan acá.
        </p>
        <FormActions submitLabel="Crear campaña" />
      </form>
    </FormPage>
  );
}
