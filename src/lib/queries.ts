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

// Caché en memoria con TTL: evita re-consultar Supabase en cada navegación.
// En dev (un solo proceso) y en instancias serverless tibias, cambiar de tab sirve desde acá.
const TTL_MS = 120_000;
const store = new Map<string, { t: number; v: unknown }>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.t < TTL_MS) return hit.v as T;
  const v = await fn();
  store.set(key, { t: Date.now(), v });
  return v;
}
/** Invalida toda la caché de datos del campo. Llamar tras cada mutación. */
export function clearFarmCache() {
  store.clear();
}

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
  lastWeighDate: string | null;
};

async function _getLots(cat: CatFilter): Promise<LotMetrics[]> {
  const lots = await prisma.lot.findMany({
    where: whereCategory(cat),
    include: {
      paddock: true,
      animals: { include: { weighings: { orderBy: { date: "asc" } } } },
    },
    orderBy: { name: "asc" },
  });

  return lots.map((lot) => {
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
    const series = [...dateSet.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    const lastAvg = last ? last.sum / last.n : 0;
    const prevAvg = prev ? prev.sum / prev.n : 0;
    const gdp = last && prev ? dailyGain(prevAvg, lastAvg, prev.date, last.date) : 0;

    return {
      id: lot.id,
      name: lot.name,
      category: lot.category,
      paddock: lot.paddock?.name ?? null,
      headCount: lot.animals.length,
      avgWeight: lastAvg,
      prevAvgWeight: prevAvg,
      gdp,
      lastWeighDate: last ? last.date.toISOString() : null,
    };
  });
}
export const getLots = (cat: CatFilter) => cached(`getLots:${cat}`, () => _getLots(cat));

export type Overview = {
  headCount: number;
  lotCount: number;
  avgGdp: number;
  conversion: number | null;
  costPerKg: number | null;
};

async function _getOverview(cat: CatFilter): Promise<Overview> {
  const [lots, rations] = await Promise.all([getLots(cat), getRations(cat)]);
  const headCount = lots.reduce((a, l) => a + l.headCount, 0);
  const weightedGdp = headCount > 0 ? lots.reduce((a, l) => a + l.gdp * l.headCount, 0) / headCount : 0;

  const fattening = lots.filter((l) => l.category !== "COW");
  let conversion: number | null = null;
  let costPerKg: number | null = null;

  if (fattening.length > 0) {
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
      dmiSum += r.dmiPerDay * periodDays * l.headCount;
      gainSum += gainPerHead * l.headCount;
      costSum += r.costPerDay * periodDays * l.headCount;
      costGainSum += gainPerHead * l.headCount;
    }
    conversion = gainSum > 0 ? feedConversion(dmiSum, gainSum) : null;
    costPerKg = costGainSum > 0 ? Math.round(costSum / costGainSum) : null;
  }

  return { headCount, lotCount: lots.length, avgGdp: weightedGdp, conversion, costPerKg };
}
export const getOverview = (cat: CatFilter) => cached(`getOverview:${cat}`, () => _getOverview(cat));

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

async function _getRations(cat: CatFilter): Promise<RationView[]> {
  const [lots, rations] = await Promise.all([
    getLots(cat),
    prisma.ration.findMany({
      where: { lot: whereCategory(cat) },
      include: { lot: true, items: { include: { ingredient: true } } },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  const lotById = new Map(lots.map((l) => [l.id, l]));

  return rations.map((r) => {
    const items = r.items.map((it) => ({
      name: it.ingredient.name,
      type: it.ingredient.type,
      percentage: it.percentage,
      kg: Math.round((it.percentage / 100) * r.kgPerHeadDay * 100) / 100,
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
export const getRations = (cat: CatFilter) => cached(`getRations:${cat}`, () => _getRations(cat));

export type AnimalRow = {
  tag: string;
  prevKg: number | null;
  currKg: number | null;
  delta: number | null;
  gdp: number | null;
};

async function _getWeighingRows(cat: CatFilter): Promise<{ lotName: string; rows: AnimalRow[] }[]> {
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
      return { tag: a.tag, prevKg: prev?.weightKg ?? null, currKg: curr?.weightKg ?? null, delta, gdp };
    }),
  }));
}
export const getWeighingRows = (cat: CatFilter) => cached(`getWeighingRows:${cat}`, () => _getWeighingRows(cat));

export type LotWeighing = { lotName: string; category: string; rows: AnimalRow[] };

async function _getLotWeighingRows(lotId: string): Promise<LotWeighing | null> {
  const lot = await prisma.lot.findUnique({
    where: { id: lotId },
    include: { animals: { include: { weighings: { orderBy: { date: "asc" } } } } },
  });
  if (!lot) return null;
  const rows = lot.animals
    .map((a) => {
      const ws = a.weighings;
      const curr = ws[ws.length - 1];
      const prev = ws[ws.length - 2];
      const delta = curr && prev ? curr.weightKg - prev.weightKg : null;
      const gdp = curr && prev ? dailyGain(prev.weightKg, curr.weightKg, prev.date, curr.date) : null;
      return { tag: a.tag, prevKg: prev?.weightKg ?? null, currKg: curr?.weightKg ?? null, delta, gdp };
    })
    .sort((a, b) => a.tag.localeCompare(b.tag));
  return { lotName: lot.name, category: lot.category, rows };
}
export const getLotWeighingRows = (lotId: string) =>
  cached(`getLotWeighingRows:${lotId}`, () => _getLotWeighingRows(lotId));

export type TreatmentRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  date: string; // ISO (Date-free para la caché)
  lotName: string;
  withdrawalDays: number;
  cost: number;
};

async function _getTreatments(cat: CatFilter): Promise<TreatmentRow[]> {
  const treatments = await prisma.treatment.findMany({
    where: { lot: whereCategory(cat) },
    include: { lot: true },
    orderBy: { date: "desc" },
  });
  return treatments.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    status: t.status,
    date: t.date.toISOString(),
    lotName: t.lot.name,
    withdrawalDays: t.withdrawalDays,
    cost: t.cost,
  }));
}
export const getTreatments = (cat: CatFilter) => cached(`getTreatments:${cat}`, () => _getTreatments(cat));

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

async function _getEconomy(cat: CatFilter): Promise<{ rows: EconomyRow[]; salePrice: number }> {
  const [lots, rations, treatments] = await Promise.all([
    getLots(cat),
    getRations(cat),
    prisma.treatment.groupBy({ by: ["lotId"], _sum: { cost: true }, where: { lot: whereCategory(cat) } }),
  ]);
  const rationByLot = new Map(rations.map((r) => [r.lotId, r]));
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
export const getEconomy = (cat: CatFilter) => cached(`getEconomy:${cat}`, () => _getEconomy(cat));

export type HerdHealth = {
  pct: number;
  onTrack: number;
  total: number;
  lowGain: number;
};

const HEALTHY_GDP = 0.8;
const LOW_GDP = 0.4;

async function _getHerdHealth(cat: CatFilter): Promise<HerdHealth> {
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
export const getHerdHealth = (cat: CatFilter) => cached(`getHerdHealth:${cat}`, () => _getHerdHealth(cat));

export function targetSaleDate(currentKg: number, gdp: number, targetKg = 450): Date | null {
  return projectDateForTarget(currentKg, targetKg, gdp, new Date("2026-06-01"));
}

/** Valor estimado del rodeo: Σ cabezas × peso prom × precio/kg. */
export function herdValue(lots: LotMetrics[]): number {
  return Math.round(lots.reduce((a, l) => a + l.headCount * l.avgWeight * SALE_PRICE_PER_KG, 0));
}
