import { prisma } from "@/lib/prisma";
import {
  CATEGORIES,
  dailyGain,
  daysBetween,
  projectDateForTarget,
  dietDryMatterPct,
  dietProteinPct,
  dryMatterIntake,
  dmiAsBodyWeightPct,
  feedConversion,
  rationCostPerDay,
  type CategoryKey,
} from "@/lib/domain";
import { FALLBACK_PRICE, PRICE_SOURCE } from "@/lib/prices";

export type CatFilter = CategoryKey | "ALL";

// Caché en memoria con TTL: evita re-consultar Supabase en cada navegación.
// En dev (un solo proceso) y en instancias serverless tibias, cambiar de tab sirve desde acá.
const TTL_MS = 120_000;
const store = new Map<string, { t: number; v: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.t < TTL_MS) return hit.v as T;
  // Dedupe: si ya hay una consulta igual en vuelo, esperamos esa (no la repetimos).
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;
  const p = (async () => {
    try {
      const v = await fn();
      store.set(key, { t: Date.now(), v });
      return v;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p as Promise<T>;
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
  // Por ingrediente: % de la mezcla, kg/cabeza/día y $/kg del insumo.
  items: { name: string; type: string; percentage: number; kg: number; costPerKg: number }[];
  dryMatterPct: number;
  proteinPct: number;
  dmiPerDay: number; // materia seca por animal por día (kg)
  dmiBodyWeightPct: number; // consumo MS como % del peso vivo
  costPerDay: number; // $ alimento por animal por día
  conversion: number;
  headCount: number;
  avgWeight: number; // peso promedio por animal (último pesaje)
  daysInFeedlot: number; // días desde que arrancó la ración (corral)
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
  const now = new Date();

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
      items: items.map(({ name, type, percentage, kg, costPerKg }) => ({ name, type, percentage, kg, costPerKg })),
      dryMatterPct: dm,
      proteinPct: protein,
      dmiPerDay: dmi,
      dmiBodyWeightPct: dmiBw,
      costPerDay: rationCostPerDay(r.kgPerHeadDay, items),
      conversion,
      headCount: lot?.headCount ?? 0,
      avgWeight: lot?.avgWeight ?? 0,
      daysInFeedlot: daysBetween(r.effectiveFrom, now),
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

// --- Precio de venta ($/kg vivo) por categoría ---
// Prioridad: precio manual del dueño > última cotización automática de mercado > respaldo fijo.
export type PriceOrigin = "MAG_CANUELAS" | "MANUAL" | "DEFAULT";
// Qué fuente automática cubre cada categoría. CALF no tiene (Cañuelas no cotiza invernada).
const SOURCE_BY_CAT: Partial<Record<CategoryKey, string>> = { STEER: "MAG_CANUELAS", COW: "MAG_CANUELAS" };
export type SalePrices = {
  byCat: Record<CategoryKey, number>;
  origin: Record<CategoryKey, PriceOrigin>;
  failing: Record<CategoryKey, boolean>; // la fuente automática de esa categoría falló en el último intento
  refDate: string | null; // fecha de la cotización de mercado más reciente usada
  lastOkAt: string | null; // último scrapeo exitoso de la fuente
  source: { name: string; url: string };
};

async function _getSalePrices(): Promise<SalePrices> {
  const [market, overrides, statuses] = await Promise.all([
    prisma.marketPrice.findMany({ orderBy: { fetchedAt: "desc" } }),
    prisma.priceSetting.findMany(),
    prisma.sourceStatus.findMany(),
  ]);
  const latestByCat = new Map<string, { price: number; refDate: Date }>();
  for (const m of market) {
    if (!latestByCat.has(m.category)) latestByCat.set(m.category, { price: m.pricePerKg, refDate: m.refDate });
  }
  const manual = new Map(overrides.map((o) => [o.category, o.pricePerKg]));
  const statusBySource = new Map(statuses.map((s) => [s.source, s]));

  const byCat = {} as Record<CategoryKey, number>;
  const origin = {} as Record<CategoryKey, PriceOrigin>;
  const failing = {} as Record<CategoryKey, boolean>;
  let refDate: Date | null = null;
  let lastOkAt: Date | null = null;
  (Object.keys(CATEGORIES) as CategoryKey[]).forEach((c) => {
    if (manual.has(c)) {
      byCat[c] = manual.get(c)!;
      origin[c] = "MANUAL";
    } else if (latestByCat.has(c)) {
      const m = latestByCat.get(c)!;
      byCat[c] = m.price;
      origin[c] = "MAG_CANUELAS";
      if (!refDate || m.refDate > refDate) refDate = m.refDate;
    } else {
      byCat[c] = FALLBACK_PRICE[c];
      origin[c] = "DEFAULT";
    }
    // Una categoría "falla" solo si su precio viene del mercado y esa fuente cayó en el último intento.
    const src = SOURCE_BY_CAT[c];
    const st = src ? statusBySource.get(src) : undefined;
    failing[c] = origin[c] === "MAG_CANUELAS" && st?.ok === false;
    if (st?.lastOkAt && (!lastOkAt || st.lastOkAt > lastOkAt)) lastOkAt = st.lastOkAt;
  });
  return {
    byCat,
    origin,
    failing,
    refDate: refDate ? (refDate as Date).toISOString() : null,
    lastOkAt: lastOkAt ? (lastOkAt as Date).toISOString() : null,
    source: { name: PRICE_SOURCE.name, url: PRICE_SOURCE.url },
  };
}
export const getSalePrices = () => cached("getSalePrices", _getSalePrices);

// Alerta liviana para el layout: ¿hay alguna fuente automática caída ahora mismo?
export type PriceAlert = { failing: boolean; sourceName: string; lastOkAt: string | null };
async function _getPriceAlert(): Promise<PriceAlert> {
  const bad = await prisma.sourceStatus.findFirst({ where: { ok: false } });
  if (!bad) return { failing: false, sourceName: "", lastOkAt: null };
  return { failing: true, sourceName: PRICE_SOURCE.name, lastOkAt: bad.lastOkAt ? bad.lastOkAt.toISOString() : null };
}
export const getPriceAlert = () => cached("getPriceAlert", _getPriceAlert);

async function _getEconomy(cat: CatFilter): Promise<{ rows: EconomyRow[]; prices: SalePrices }> {
  const [lots, rations, treatments, prices] = await Promise.all([
    getLots(cat),
    getRations(cat),
    prisma.treatment.groupBy({ by: ["lotId"], _sum: { cost: true }, where: { lot: whereCategory(cat) } }),
    getSalePrices(),
  ]);
  const rationByLot = new Map(rations.map((r) => [r.lotId, r]));
  const vetByLot = new Map(treatments.map((t) => [t.lotId, t._sum.cost ?? 0]));

  const rows = lots.map((l) => {
    const r = rationByLot.get(l.id);
    const periodDays = 90;
    const feedCost = r ? r.costPerDay * periodDays * l.headCount : 0;
    const vetCost = vetByLot.get(l.id) ?? 0;
    const isFattening = l.category !== "COW";
    const salePrice = prices.byCat[l.category as CategoryKey] ?? 0;
    const costPerKg = isFattening && r && l.gdp > 0 ? r.costPerDay / l.gdp : null;
    const marginPerKg = costPerKg !== null ? salePrice - costPerKg : null;
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

  return { rows, prices };
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

export type OwnerSplit = {
  owners: { id: string; name: string; globalPct: number | null; kg: number; valueShare: number; marginShare: number }[];
  lots: {
    lotId: string;
    lotName: string;
    category: string;
    kg: number;
    custom: boolean;
    parts: { ownerId: string; name: string; pct: number; kg: number }[];
  }[];
  totalKg: number;
};

async function _getOwnerSplit(cat: CatFilter): Promise<OwnerSplit> {
  const [owners, lots, shares, economy] = await Promise.all([
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
    getLots(cat),
    prisma.share.findMany(),
    getEconomy(cat),
  ]);
  const marginPerKgByLot = new Map(economy.rows.map((r) => [r.lotId, r.marginPerKg]));
  const priceByCat = economy.prices.byCat;

  const globalByOwner = new Map<string, number>();
  const lotShares = new Map<string, { ownerId: string; sharePct: number }[]>();
  for (const s of shares) {
    if (s.lotId === null) globalByOwner.set(s.ownerId, s.sharePct);
    else {
      const arr = lotShares.get(s.lotId) ?? [];
      arr.push({ ownerId: s.ownerId, sharePct: s.sharePct });
      lotShares.set(s.lotId, arr);
    }
  }

  const ownerKg = new Map<string, number>();
  const ownerValue = new Map<string, number>();
  const ownerMargin = new Map<string, number>();
  const lotsOut = lots.map((l) => {
    const kg = l.headCount * l.avgWeight;
    const valuePerKg = priceByCat[l.category as CategoryKey] ?? 0;
    const mpk = marginPerKgByLot.get(l.id) ?? null;
    const lotMargin = mpk !== null ? mpk * kg : 0; // vacas de cría: margen 0
    const custom = lotShares.has(l.id);
    const eff = custom
      ? lotShares.get(l.id)!
      : owners.map((o) => ({ ownerId: o.id, sharePct: globalByOwner.get(o.id) ?? 0 }));
    const parts = eff
      .map((e) => {
        const o = owners.find((x) => x.id === e.ownerId);
        const f = e.sharePct / 100;
        ownerKg.set(e.ownerId, (ownerKg.get(e.ownerId) ?? 0) + kg * f);
        ownerValue.set(e.ownerId, (ownerValue.get(e.ownerId) ?? 0) + kg * f * valuePerKg);
        ownerMargin.set(e.ownerId, (ownerMargin.get(e.ownerId) ?? 0) + lotMargin * f);
        return { ownerId: e.ownerId, name: o?.name ?? "—", pct: e.sharePct, kg: Math.round(kg * f) };
      })
      .filter((p) => p.pct > 0);
    return { lotId: l.id, lotName: l.name, category: l.category, kg: Math.round(kg), custom, parts };
  });

  const ownersOut = owners.map((o) => ({
    id: o.id,
    name: o.name,
    globalPct: globalByOwner.has(o.id) ? globalByOwner.get(o.id)! : null,
    kg: Math.round(ownerKg.get(o.id) ?? 0),
    valueShare: Math.round(ownerValue.get(o.id) ?? 0),
    marginShare: Math.round(ownerMargin.get(o.id) ?? 0),
  }));
  const totalKg = Math.round(lots.reduce((a, l) => a + l.headCount * l.avgWeight, 0));
  return { owners: ownersOut, lots: lotsOut, totalKg };
}
export const getOwnerSplit = (cat: CatFilter) => cached(`getOwnerSplit:${cat}`, () => _getOwnerSplit(cat));

export async function getOwners() {
  return prisma.owner.findMany({ orderBy: { name: "asc" } });
}

export function targetSaleDate(currentKg: number, gdp: number, targetKg = 450): Date | null {
  return projectDateForTarget(currentKg, targetKg, gdp, new Date("2026-06-01"));
}

/** Valor estimado del rodeo: Σ cabezas × peso prom × precio/kg de su categoría. */
export function herdValue(lots: LotMetrics[], priceByCat: Record<string, number>): number {
  return Math.round(lots.reduce((a, l) => a + l.headCount * l.avgWeight * (priceByCat[l.category] ?? 0), 0));
}
