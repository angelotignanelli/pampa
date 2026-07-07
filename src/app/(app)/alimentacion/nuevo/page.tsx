import { prisma } from "@/lib/prisma";
import { createRation } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel, INGREDIENT_TYPES } from "@/lib/domain";

export default async function NuevaRacionPage({ searchParams }: { searchParams: Promise<{ lot?: string }> }) {
  const lotId = (await searchParams).lot;
  const [lots, ingredients] = await Promise.all([
    prisma.lot.findMany({ orderBy: { name: "asc" } }),
    prisma.feedIngredient.findMany({ orderBy: { name: "asc" } }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  // Si viene ?lot, precargamos la ración vigente de ese lote (para cambiar ración y/o %).
  const currentRation = lotId
    ? await prisma.ration.findFirst({ where: { lotId, effectiveTo: null }, include: { items: true } })
    : null;
  const currentLot = lotId ? lots.find((l) => l.id === lotId) : null;
  const pctById = new Map((currentRation?.items ?? []).map((it) => [it.ingredientId, it.percentage]));
  const isChange = !!currentRation;
  const title = isChange ? `Cambiar ración — ${currentLot?.name}` : "Nueva receta de mixer";

  return (
    <FormPage title={title} backHref={lotId ? `/alimentacion/${lotId}` : "/alimentacion"}>
      <form action={createRation} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {currentLot ? (
          <>
            <input type="hidden" name="lotId" value={currentLot.id} />
            <Field label="Lote">
              <div style={{ ...fieldStyle, display: "flex", alignItems: "center", color: "var(--text-secondary)" }}>
                {currentLot.name} ({categoryLabel(currentLot.category)})
              </div>
            </Field>
          </>
        ) : (
          <Field label="Lote">
            <select name="lotId" required style={fieldStyle} defaultValue="">
              <option value="" disabled>Elegí el lote…</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Nombre de la receta">
          <input name="name" required defaultValue={currentRation?.name ?? ""} placeholder="Mixer engorde" style={fieldStyle} />
        </Field>
        <Field label="Cantidad de ración por día (kg)" hint="Total de mezcla por día para el lote. El kg por cabeza se calcula con la cantidad de animales.">
          <input name="kgPerDay" type="number" step="1" min="0" required defaultValue={currentRation?.kgPerDay ?? undefined} placeholder="228" style={fieldStyle} />
        </Field>
        <Field label="Vigente desde" hint={isChange ? "Desde este día rige la ración nueva; lo anterior queda registrado en su período." : undefined}>
          <input name="effectiveFrom" type="date" defaultValue={today} style={fieldStyle} />
        </Field>

        <div>
          <p style={{ margin: "4px 0 8px", fontSize: 12, color: "var(--text-secondary)" }}>
            Composición (% sobre la mezcla){isChange ? " — editá lo que cambie; el resto se mantiene" : " — queda fija hasta que cargues una receta nueva"}
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
                  defaultValue={pctById.get(ing.id) ?? 0}
                  style={{ ...fieldStyle, width: 90 }}
                />
                <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>%</span>
              </div>
            ))}
          </div>
        </div>

        <FormActions submitLabel={isChange ? "Guardar cambio" : "Guardar receta"} />
      </form>
    </FormPage>
  );
}
