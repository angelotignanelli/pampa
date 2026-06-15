import { prisma } from "@/lib/prisma";
import {
  dailyGain,
  projectDateForTarget,
  dietDryMatterPct,
  dietProteinPct,
  dryMatterIntake,
  dmiAsBodyWeightPct,
  feedConversion,
  rationCostPerDay,
  type CategoryKey,
} from "@/lib/domain";

export type CatFilter = CategoryKey | "ALL";

function whereCategory(cat: CatFilter) {
  return cat === "ALL" ? {} : { category: cat };
}

export type LotMetrics = {
  id: string;
  name: string;
  category: string;
  paddock: string | null;
  headCount: number;
  avgWeight: number;
  prevAvgWeight: number;
  gdp: number;
  series: { date: Date; avg: number }[];
};

/** Carga los lotes con sus animales y pesajes, y calcula peso promedio y GDP. */
export async function getLots(cat: CatFilter): Promise<LotMetrics[]> {
  const lots = await prisma.lot.findMany({
    where: whereCategory(cat),
    include: {
      paddock: true,
      animals: { include: { weighings: { orderBy: { date: "asc" } } } },
    },
    orderBy: { name: "asc" },
  });

  return lots.map((lot) => {
    // Fechas de pesaje únicas del lote
    const dateSet = new Map<number, { sum: number; n: number; date: Date }>();
    for (const a of lot.animals) {
      for (const w of a.weighings) {
        const key = w.date.getTime();
        const entry = dateSet.get(key) ?? { sum: 0, n: 0, date: w.date };
        entry.sum += w.weightKg;
        entry.n += 1;
        dateSet.set(key, entry);
      }
    }
    const series = [...dateSet.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((e) => ({ date: e.date, avg: e.sum / e.n }));

    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const gdp = last && prev ? dailyGain(prev.avg, last.avg, prev.date, last.date) : 0;

    return {
      id: lot.id,
      name: lot.name,
      category: lot.category,
      paddock: lot.paddock?.name ?? null,
      headCount: lot.animals.length,
      avgWeight: last ? last.avg : 0,
      prevAvgWeight: prev ? prev.avg : 0,
      gdp,
      series,
    };
  });
}

export type Overview = {
  headCount: number;
  lotCount: number;
  avgGdp: number;
  conversion: number | null;
  costPerKg: number | null;
};

export async function getOverview(cat: CatFilter, lotsArg?: LotMetrics[], rationsArg?: RationView[]): Promise<Overview> {
  const lots = lotsArg ?? (await getLots(cat));
  const headCount = lots.reduce((a, l) => a + l.headCount, 0);
  const weightedGdp =
    headCount > 0 ? lots.reduce((a, l) => a + l.gdp * l.headCount, 0) / headCount : 0;

  // Conversión y costo/kg sólo para categorías de engorde (no vacas de cría)
  const fattening = lots.filter((l) => l.category !== "COW");
  let conversion: number | null = null;
  let costPerKg: number | null = null;

  if (fattening.length > 0) {
    const rations = rationsArg ?? (await getRations(cat, lots));
    const byLot = new Map(rations.map((r) => [r.lotId, r]));
    let dmiSum = 0;
    let gainSum = 0;
    let costSum = 0;
    let costGainSum = 0;
    for (const l of fattening) {
      const r = byLot.get(l.id);
      if (!r) continue;
      const periodDays = 30;
      const gainPerHead = l.gdp * periodDays;
      const dmiTotal = r.dmiPerDay * periodDays;
      dmiSum += dmiTotal * l.headCount;
      gainSum += gainPerHead * l.headCount;
      costSum += r.costPerDay * periodDays * l.headCount;
      costGainSum += gainPerHead * l.headCount;
    }
    conversion = gainSum > 0 ? feedConversion(dmiSum, gainSum) : null;
    costPerKg = costGainSum > 0 ? Math.round(costSum / costGainSum) : null;
  }

  return {
    headCount,
    lotCount: lots.length,
    avgGdp: weightedGdp,
    conversion,
    costPerKg,
  };
}

export type RationView = {
  lotId: string;
  lotName: string;
  category: string;
  name: string;
  kgPerHeadDay: number;
  items: { name: string; type: string; percentage: number; kg: number }[];
  dryMatterPct: number;
  proteinPct: number;
  dmiPerDay: number;
  dmiBodyWeightPct: number;
  costPerDay: number;
  conversion: number;
};

export async function getRations(cat: CatFilter, lotsArg?: LotMetrics[]): Promise<RationView[]> {
  const lots = lotsArg ?? (await getLots(cat));
  const lotById = new Map(lots.map((l) => [l.id, l]));

  const rations = await prisma.ration.findMany({
    where: { lot: whereCategory(cat) },
    include: { lot: true, items: { include: { ingredient: true } } },
    orderBy: { effectiveFrom: "desc" },
  });

  return rations.map((r) => {
    const items = r.items.map((it) => ({
      name: it.ingredient.name,
      type: it.ingredient.type,
      percentage: it.percentage,
      kg: Math.round(((it.percentage / 100) * r.kgPerHeadDay) * 100) / 100,
      dryMatterPct: it.ingredient.dryMatterPct,
      proteinPct: it.ingredient.proteinPct,
      costPerKg: it.ingredient.costPerKg,
    }));
    const dm = dietDryMatterPct(items);
    const protein = dietProteinPct(items);
    const dmi = dryMatterIntake(r.kgPerHeadDay, dm);
    const lot = lotById.get(r.lotId);
    const dmiBw = lot ? dmiAsBodyWeightPct(dmi, lot.avgWeight) : 0;
    const gainPerDay = lot ? lot.gdp : 0;
    const conversion = gainPerDay > 0 ? feedConversion(dmi, gainPerDay) : 0;

    return {
      lotId: r.lotId,
      lotName: r.lot.name,
      category: r.lot.category,
      name: r.name,
      kgPerHeadDay: r.kgPerHeadDay,
      items: items.map(({ name, type, percentage, kg }) => ({ name, type, percentage, kg })),
      dryMatterPct: dm,
      proteinPct: protein,
      dmiPerDay: dmi,
      dmiBodyWeightPct: dmiBw,
      costPerDay: rationCostPerDay(r.kgPerHeadDay, items),
      conversion,
    };
  });
}

export type AnimalRow = {
  tag: string;
  prevKg: number | null;
  currKg: number | null;
  delta: number | null;
  gdp: number | null;
};

export async function getWeighingRows(cat: CatFilter): Promise<{ lotName: string; rows: AnimalRow[] }[]> {
  const lots = await prisma.lot.findMany({
    where: whereCategory(cat),
    include: { animals: { include: { weighings: { orderBy: { date: "asc" } } } } },
    orderBy: { name: "asc" },
  });

  return lots.map((lot) => ({
    lotName: lot.name,
    rows: lot.animals.map((a) => {
      const ws = a.weighings;
      const curr = ws[ws.length - 1];
      const prev = ws[ws.length - 2];
      const delta = curr && prev ? curr.weightKg - prev.weightKg : null;
      const gdp = curr && prev ? dailyGain(prev.weightKg, curr.weightKg, prev.date, curr.date) : null;
      return {
        tag: a.tag,
        prevKg: prev?.weightKg ?? null,
        currKg: curr?.weightKg ?? null,
        delta,
        gdp,
      };
    }),
  }));
}

export async function getTreatments(cat: CatFilter) {
  return prisma.treatment.findMany({
    where: { lot: whereCategory(cat) },
    include: { lot: true },
    orderBy: { date: "desc" },
  });
}

export type EconomyRow = {
  lotId: string;
  lotName: string;
  category: string;
  feedCost: number;
  vetCost: number;
  costPerKg: number | null;
  marginPerKg: number | null;
};

const SALE_PRICE_PER_KG = 1950;

export async function getEconomy(cat: CatFilter, lotsArg?: LotMetrics[], rationsArg?: RationView[]): Promise<{ rows: EconomyRow[]; salePrice: number }> {
  const lots = lotsArg ?? (await getLots(cat));
  const rations = rationsArg ?? (await getRations(cat, lots));
  const rationByLot = new Map(rations.map((r) => [r.lotId, r]));
  const treatments = await prisma.treatment.groupBy({
    by: ["lotId"],
    _sum: { cost: true },
    where: { lot: whereCategory(cat) },
  });
  const vetByLot = new Map(treatments.map((t) => [t.lotId, t._sum.cost ?? 0]));

  const rows = lots.map((l) => {
    const r = rationByLot.get(l.id);
    const periodDays = 90;
    const feedCost = r ? r.costPerDay * periodDays * l.headCount : 0;
    const vetCost = vetByLot.get(l.id) ?? 0;
    const isFattening = l.category !== "COW";
    const costPerKg = isFattening && r && l.gdp > 0 ? r.costPerDay / l.gdp : null;
    const marginPerKg = costPerKg !== null ? SALE_PRICE_PER_KG - costPerKg : null;
    return {
      lotId: l.id,
      lotName: l.name,
      category: l.category,
      feedCost,
      vetCost,
      costPerKg: costPerKg !== null ? Math.round(costPerKg) : null,
      marginPerKg: marginPerKg !== null ? Math.round(marginPerKg) : null,
    };
  });

  return { rows, salePrice: SALE_PRICE_PER_KG };
}

export function targetSaleDate(currentKg: number, gdp: number, targetKg = 450): Date | null {
  return projectDateForTarget(currentKg, targetKg, gdp, new Date("2026-06-01"));
}

export type HerdHealth = {
  pct: number; // % de animales con buen ritmo
  onTrack: number;
  total: number;
  lowGain: number; // animales sin progreso
};

const HEALTHY_GDP = 0.8;
const LOW_GDP = 0.4;

/** Salud del rodeo: proporción de animales (de engorde) con GDP saludable. */
export async function getHerdHealth(cat: CatFilter): Promise<HerdHealth> {
  const animals = await prisma.animal.findMany({
    where: { ...whereCategory(cat), category: cat === "ALL" ? { not: "COW" } : cat, status: "ACTIVE" },
    include: { weighings: { orderBy: { date: "asc" } } },
  });

  let onTrack = 0;
  let lowGain = 0;
  let total = 0;
  for (const a of animals) {
    const ws = a.weighings;
    if (ws.length < 2) continue;
    const curr = ws[ws.length - 1];
    const prev = ws[ws.length - 2];
    const gdp = dailyGain(prev.weightKg, curr.weightKg, prev.date, curr.date);
    total += 1;
    if (gdp >= HEALTHY_GDP) onTrack += 1;
    if (gdp < LOW_GDP) lowGain += 1;
  }
  return { pct: total > 0 ? (onTrack / total) * 100 : 0, onTrack, total, lowGain };
}

/** Valor estimado del rodeo: Σ cabezas × peso prom × precio/kg. */
export function herdValue(lots: LotMetrics[]): number {
  return Math.round(lots.reduce((a, l) => a + l.headCount * l.avgWeight * SALE_PRICE_PER_KG, 0));
}
