import { prisma } from "@/lib/prisma";
import { createAnimals } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel } from "@/lib/domain";

export default async function NuevosAnimalesPage() {
  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });

  return (
    <FormPage title="Agregar animales" backHref="/lotes">
      <form action={createAnimals} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Lote" hint="La categoría se toma del lote.">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Cantidad" hint="Cuántos animales cargar de una.">
            <input name="quantity" type="number" min="1" max="2000" defaultValue="40" required style={fieldStyle} />
          </Field>
          <Field label="Sexo">
            <select name="sex" style={fieldStyle} defaultValue="">
              <option value="">Sin especificar</option>
              <option value="M">Macho</option>
              <option value="F">Hembra</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Prefijo de caravana" hint="Ej. H- para hembras.">
            <input name="tagPrefix" defaultValue="H-" style={fieldStyle} />
          </Field>
          <Field label="Número inicial">
            <input name="startNumber" type="number" min="1" defaultValue="1" style={fieldStyle} />
          </Field>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Se crearán caravanas correlativas: <code>prefijo + número</code> (ej. <strong>H-0001 … H-0040</strong>).
          Las caravanas que ya existan se omiten. Después podés editar o renombrar cada una.
        </p>

        <FormActions submitLabel="Agregar animales" />
      </form>
    </FormPage>
  );
}
