import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/auth";
import { getHerdHealth } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  const [health, pendingTreatments] = await Promise.all([
    getHerdHealth("ALL"),
    prisma.treatment.count({ where: { status: { in: ["PENDING", "SCHEDULED"] } } }),
  ]);

  const badges = { pesajes: health.lowGain, sanidad: pendingTreatments };

  return (
    <Suspense>
      <Shell user={user} badges={badges}>
        {children}
      </Shell>
    </Suspense>
  );
}
