import { prisma } from "@/lib/prisma";
import { createWeighing } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel } from "@/lib/domain";

export default async function NuevoPesajePage() {
  const animals = await prisma.animal.findMany({
    where: { status: "ACTIVE" },
    include: { lot: true },
    orderBy: { tag: "asc" },
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Nuevo pesaje" backHref="/pesajes">
      <form action={createWeighing} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Animal">
          <select name="animalId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el animal…</option>
            {animals.map((a) => (
              <option key={a.id} value={a.id}>
                {a.tag} · {a.lot.name} ({categoryLabel(a.category)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Peso (kg)">
          <input name="weightKg" type="number" step="0.1" min="0" required placeholder="392" style={fieldStyle} />
        </Field>
        <Field label="Fecha">
          <input name="date" type="date" defaultValue={today} style={fieldStyle} />
        </Field>
        <FormActions submitLabel="Guardar pesaje" />
      </form>
    </FormPage>
  );
}
