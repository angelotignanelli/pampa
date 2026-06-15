import { prisma } from "@/lib/prisma";
import { createLot } from "@/lib/actions/crud";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FormPage, Field, FormActions, fieldStyle } from "@/components/Form";
import { CATEGORIES } from "@/lib/domain";

export default async function NuevoLotePage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role === "WORKER") {
    return (
      <FormPage title="Nuevo lote" backHref="/lotes">
        <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
          Solo el dueño o el encargado pueden crear lotes.
        </p>
      </FormPage>
    );
  }

  const paddocks = await prisma.paddock.findMany({ orderBy: { name: "asc" } });

  return (
    <FormPage title="Nuevo lote" backHref="/lotes">
      <form action={createLot} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nombre del lote">
          <input name="name" required placeholder="Novillos 04" style={fieldStyle} />
        </Field>
        <Field label="Categoría">
          <select name="category" required style={fieldStyle} defaultValue="">
            <option value="" disabled>Elegí…</option>
            {Object.values(CATEGORIES).map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Potrero (opcional)">
          <select name="paddockId" style={fieldStyle} defaultValue="">
            <option value="">Sin asignar</option>
            {paddocks.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
        <FormActions submitLabel="Crear lote" />
      </form>
    </FormPage>
  );
}
