import { prisma } from "@/lib/prisma";
import { createGroupWeighing } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel } from "@/lib/domain";

export default async function PesajeGrupalPage() {
  const lots = await prisma.lot.findMany({
    orderBy: { name: "asc" },
    include: { animals: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  const conStock = lots.filter((l) => l.animals.length > 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Pesaje grupal" backHref="/pesajes">
      <form action={createGroupWeighing} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Lote">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {conStock.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)}) · {l.animals.length} activos</option>
            ))}
          </select>
        </Field>

        <Field label="Sexo" hint="Para pesar solo machos o solo hembras del lote.">
          <select name="sex" style={fieldStyle} defaultValue="">
            <option value="">Todos</option>
            <option value="M">Machos</option>
            <option value="F">Hembras</option>
          </select>
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Cantidad de cabezas">
            <input name="quantity" type="number" min="1" required placeholder="54" style={fieldStyle} />
          </Field>
          <Field label="Peso total del grupo (kg)">
            <input name="totalKg" type="number" step="0.1" min="0" required placeholder="15660" style={fieldStyle} />
          </Field>
        </div>

        <Field label="Fecha">
          <input name="date" type="date" defaultValue={today} style={fieldStyle} />
        </Field>

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Se reparte el <strong>promedio</strong> (peso total ÷ cantidad) a cada animal. Ejemplo: 54 cabezas con
          15.660 kg quedan en 290 kg cada una. Sirve cuando pesás la tropa junta y no animal por animal.
        </p>

        <FormActions submitLabel="Guardar pesaje grupal" />
      </form>
    </FormPage>
  );
}
