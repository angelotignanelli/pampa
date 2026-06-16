import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPriceAlert } from "@/lib/queries";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  // Solo un conteo liviano para el badge de Sanidad (sin cargar animales/pesajes).
  const [pendingTreatments, priceAlert] = await Promise.all([
    prisma.treatment.count({ where: { status: { in: ["PENDING", "SCHEDULED"] } } }),
    getPriceAlert(),
  ]);

  return (
    <Suspense>
      <Shell user={user} badges={{ sanidad: pendingTreatments }} priceAlert={priceAlert}>
        {children}
      </Shell>
    </Suspense>
  );
}
