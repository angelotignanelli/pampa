import { prisma } from "@/lib/prisma";
import { registerExit } from "@/lib/actions/crud";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { categoryLabel } from "@/lib/domain";

export default async function NuevoEgresoPage() {
  const lots = await prisma.lot.findMany({
    orderBy: { name: "asc" },
    include: { animals: { where: { status: "ACTIVE" }, select: { id: true } } },
  });
  const conStock = lots.filter((l) => l.animals.length > 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormPage title="Registrar egreso" backHref="/lotes">
      <form action={registerExit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Lote">
          <select name="lotId" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí el lote…</option>
            {conStock.map((l) => (
              <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)}) · {l.animals.length} activos</option>
            ))}
          </select>
        </Field>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Tipo">
            <select name="kind" required style={fieldStyle} defaultValue="SALE">
              <option value="SALE">Venta</option>
              <option value="DEATH">Baja (muerte)</option>
            </select>
          </Field>
          <Field label="Fecha">
            <input name="date" type="date" defaultValue={today} style={fieldStyle} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Cantidad de cabezas">
            <input name="quantity" type="number" min="1" required placeholder="20" style={fieldStyle} />
          </Field>
          <Field label="Precio $/kg" hint="Solo para ventas. Se aplica al último peso de cada animal.">
            <input name="pricePerKg" type="number" min="0" step="1" placeholder="4500" style={fieldStyle} />
          </Field>
        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
          Los animales no se borran: salen del stock activo y quedan guardados con su fecha, peso y precio de
          salida. Se registra el movimiento para el histórico y la economía.
        </p>

        <FormActions submitLabel="Registrar egreso" />
      </form>
    </FormPage>
  );
}
