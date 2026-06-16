// Cron diario (ver vercel.json): trae la cotización de hacienda y la guarda en MarketPrice.
// Vercel agrega el header Authorization: Bearer ${CRON_SECRET} a las llamadas del cron.
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCanuelasPrices, PRICE_SOURCE } from "@/lib/prices";
import { clearFarmCache } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  try {
    const prices = await fetchCanuelasPrices();
    await prisma.marketPrice.createMany({
      data: prices.map((p) => ({
        source: PRICE_SOURCE.code,
        category: p.category,
        label: p.label,
        pricePerKg: p.pricePerKg,
        refDate: p.refDate,
      })),
    });
    await prisma.sourceStatus.upsert({
      where: { source: PRICE_SOURCE.code },
      update: { ok: true, lastOkAt: now, lastTryAt: now, message: null },
      create: { source: PRICE_SOURCE.code, ok: true, lastOkAt: now, lastTryAt: now },
    });
    clearFarmCache();
    return Response.json({
      ok: true,
      source: PRICE_SOURCE.code,
      fetched: prices.map((p) => ({ category: p.category, pricePerKg: p.pricePerKg })),
      refDate: prices[0]?.refDate ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    // No rompe: marcamos la fuente como caída y la app sigue con el último valor guardado.
    await prisma.sourceStatus.upsert({
      where: { source: PRICE_SOURCE.code },
      update: { ok: false, lastTryAt: now, message },
      create: { source: PRICE_SOURCE.code, ok: false, lastTryAt: now, message },
    });
    clearFarmCache();
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
