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
    clearFarmCache();
    return Response.json({
      ok: true,
      source: PRICE_SOURCE.code,
      fetched: prices.map((p) => ({ category: p.category, pricePerKg: p.pricePerKg })),
      refDate: prices[0]?.refDate ?? null,
    });
  } catch (e) {
    // No rompe: la app sigue usando el último precio guardado (o el respaldo).
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Error desconocido" }, { status: 502 });
  }
}
