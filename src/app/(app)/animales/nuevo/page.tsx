import { prisma } from "@/lib/prisma";
import { createAnimal } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel } from "@/lib/domain";

export default async function NuevoAnimalPage() {
  const lots = await prisma.lot.findMany({ orderBy: { name: "asc" } });

  return (
    <FormPage title="Nuevo animal" backHref="/lotes">
      <form action={createAnimal} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Caravana">
          <input name="tag" required placeholder="AR-0500" style={fieldStyle} />
        </Field>
        <Field label="Chip / RFID (opcional)">
          <input name="rfid" placeholder="982000000000500" style={fieldStyle} />
        </Field>
        <Field label="Lote" hint="La categoría se toma del lote.">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
            ))}
          </select>
        </Field>
        <Field label="Sexo">
          <select name="sex" style={fieldStyle} defaultValue="">
            <option value="">Sin especificar</option>
            <option value="M">Macho</option>
            <option value="F">Hembra</option>
          </select>
        </Field>
        <FormActions submitLabel="Agregar animal" />
      </form>
    </FormPage>
  );
}
