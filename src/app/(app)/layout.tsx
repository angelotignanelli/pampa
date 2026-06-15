import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  // Solo un conteo liviano para el badge de Sanidad (sin cargar animales/pesajes).
  const pendingTreatments = await prisma.treatment.count({
    where: { status: { in: ["PENDING", "SCHEDULED"] } },
  });

  return (
    <Suspense>
      <Shell user={user} badges={{ sanidad: pendingTreatments }}>
        {children}
      </Shell>
    </Suspense>
  );
}
