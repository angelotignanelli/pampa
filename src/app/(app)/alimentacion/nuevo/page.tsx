import { prisma } from "@/lib/prisma";
import { createRation } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel, INGREDIENT_TYPES } from "@/lib/domain";

export default async function NuevaRacionPage() {
  const [lots, ingredients] = await Promise.all([
    prisma.lot.findMany({ orderBy: { name: "asc" } }),
    prisma.feedIngredient.findMany({ orderBy: { name: "asc" } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Nueva receta de mixer" backHref="/alimentacion">
      <form action={createRation} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Lote">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
            ))}
          </select>
        </Field>
        <Field label="Nombre de la receta">
          <input name="name" required placeholder="Mixer engorde" style={fieldStyle} />
        </Field>
        <Field label="Ración por cabeza por día (kg)">
          <input name="kgPerHeadDay" type="number" step="0.1" min="0" required placeholder="9.5" style={fieldStyle} />
        </Field>
        <Field label="Vigente desde">
          <input name="effectiveFrom" type="date" defaultValue={today} style={fieldStyle} />
        </Field>

        <div>
          <p style={{ margin: "4px 0 8px", fontSize: 12, color: "var(--text-secondary)" }}>
            Composición (% sobre la mezcla)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ingredients.map((ing) => (
              <div key={ing.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13 }}>
                  {ing.name}{" "}
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    ({INGREDIENT_TYPES[ing.type as keyof typeof INGREDIENT_TYPES] ?? ing.type})
                  </span>
                </span>
                <input
                  name={`pct_${ing.id}`}
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  defaultValue="0"
                  style={{ ...fieldStyle, width: 90 }}
                />
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>%</span>
              </div>
            ))}
          </div>
        </div>

        <FormActions submitLabel="Guardar receta" />
      </form>
    </FormPage>
  );
}
