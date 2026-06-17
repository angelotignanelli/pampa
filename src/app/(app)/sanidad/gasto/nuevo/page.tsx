import { prisma } from "@/lib/prisma";
import { createExpense } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel, EXPENSE_CATEGORIES } from "@/lib/domain";

export default async function NuevoGastoPage() {
  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Nuevo gasto" backHref="/sanidad">
      <form action={createExpense} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Categoría">
            <select name="category" required style={fieldStyle} defaultValue="SANIDAD">
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input name="date" type="date" defaultValue={today} style={fieldStyle} />
          </Field>
        </div>

        <Field label="Concepto" hint="Qué se pagó.">
          <input name="concept" required placeholder="Ej. Honorarios veterinario, compra de vacunas" style={fieldStyle} />
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Monto (ARS)">
            <input name="amount" type="number" min="0" step="1" required placeholder="120000" style={fieldStyle} />
          </Field>
          <Field label="Lote" hint="Opcional: si el gasto es de un lote puntual.">
            <select name="lotId" style={fieldStyle} defaultValue="">
              <option value="">Todo el establecimiento</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
              ))}
            </select>
          </Field>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Los gastos de sanidad asignados a un lote se suman al <strong>costo veterinario</strong> de ese lote en Economía.
        </p>

        <FormActions submitLabel="Guardar gasto" />
      </form>
    </FormPage>
  );
}
