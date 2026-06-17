"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth";
import { clearFarmCache, getLots, getSalePrices, getEconomy, getOwnerSplit, herdValue } from "@/lib/queries";

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function str(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim();
}
function date(v: FormDataEntryValue | null): Date {
  const s = str(v);
  const d = s ? new Date(s) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function farmId(): Promise<string> {
  const farm = await prisma.farm.findFirst();
  if (!farm) throw new Error("No hay establecimiento configurado");
  return farm.id;
}

export async function createWeighing(formData: FormData) {
  const user = await requireUser();
  const animalId = str(formData.get("animalId"));
  const weightKg = num(formData.get("weightKg"));
  if (!animalId || weightKg <= 0) throw new Error("Datos de pesaje inválidos");

  const animal = await prisma.animal.findUnique({ where: { id: animalId } });
  if (!animal) throw new Error("Animal no encontrado");

  await prisma.weighing.create({
    data: {
      animalId,
      lotId: animal.lotId,
      weightKg,
      date: date(formData.get("date")),
      createdById: user.id,
    },
  });
  clearFarmCache();
  revalidatePath("/pesajes");
  revalidatePath("/");
  redirect("/pesajes");
}

// Pesaje grupal: se carga el total de kg de un grupo y se reparte el promedio a cada animal.
// Útil cuando se pesa la tropa junta (ej. 54 machos = 15.660 kg → 290 kg c/u).
export async function createGroupWeighing(formData: FormData) {
  const user = await requireUser();
  const lotId = str(formData.get("lotId"));
  const sex = str(formData.get("sex")); // "" (todos) | M | F
  const quantity = Math.round(num(formData.get("quantity")));
  const totalKg = num(formData.get("totalKg"));
  if (!lotId || quantity < 1 || totalKg <= 0) throw new Error("Datos de pesaje grupal inválidos");

  const animals = await prisma.animal.findMany({
    where: { lotId, status: "ACTIVE", ...(sex ? { sex } : {}) },
    orderBy: { tag: "asc" },
    take: quantity,
    select: { id: true },
  });
  if (animals.length < quantity) {
    throw new Error(`Solo hay ${animals.length} animales activos que coinciden con el filtro`);
  }

  const avg = Math.round((totalKg / quantity) * 10) / 10; // promedio con 1 decimal
  const when = date(formData.get("date"));
  await prisma.weighing.createMany({
    data: animals.map((a) => ({ animalId: a.id, lotId, weightKg: avg, date: when, createdById: user.id })),
  });
  clearFarmCache();
  revalidatePath("/pesajes");
  revalidatePath("/");
  redirect("/pesajes");
}

export async function createLot(formData: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("No autorizado");
  const name = str(formData.get("name"));
  const category = str(formData.get("category"));
  if (!name || !category) throw new Error("Datos de lote inválidos");

  await prisma.lot.create({
    data: {
      name,
      category,
      farmId: await farmId(),
      paddockId: str(formData.get("paddockId")) || null,
    },
  });
  clearFarmCache();
  revalidatePath("/lotes");
  redirect("/lotes");
}

export async function createAnimals(formData: FormData) {
  const user = await requireUser();
  let lotId = str(formData.get("lotId"));
  const quantity = Math.round(num(formData.get("quantity")));
  const sex = str(formData.get("sex")) || null;
  const prefix = str(formData.get("tagPrefix"));
  const start = Math.max(1, Math.round(num(formData.get("startNumber")) || 1));
  if (quantity < 1) throw new Error("Datos de animales inválidos");
  if (quantity > 2000) throw new Error("Máximo 2000 animales por carga");

  let category: string;
  if (lotId === "__new__") {
    // Crear el lote sobre la marcha (solo dueño/encargado).
    if (!canManage(user.role)) throw new Error("Solo el dueño o el encargado puede crear lotes");
    const name = str(formData.get("newLotName"));
    category = str(formData.get("newLotCategory"));
    if (!name || !category) throw new Error("Faltan datos del nuevo lote");
    const lot = await prisma.lot.create({
      data: {
        name,
        category,
        farmId: await farmId(),
        paddockId: str(formData.get("newLotPaddock")) || null,
      },
    });
    lotId = lot.id;
  } else {
    if (!lotId) throw new Error("Elegí un lote");
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) throw new Error("Lote no encontrado");
    category = lot.category;
  }

  const data = Array.from({ length: quantity }, (_, i) => ({
    tag: `${prefix}${String(start + i).padStart(4, "0")}`,
    category,
    sex,
    lotId,
  }));
  // skipDuplicates evita romper si alguna caravana ya existe (se omite y sigue).
  await prisma.animal.createMany({ data, skipDuplicates: true });
  clearFarmCache();
  revalidatePath("/lotes");
  redirect("/lotes");
}

export async function createRation(formData: FormData) {
  await requireUser();
  const lotId = str(formData.get("lotId"));
  const name = str(formData.get("name"));
  const kgPerHeadDay = num(formData.get("kgPerHeadDay"));
  if (!lotId || !name || kgPerHeadDay <= 0) throw new Error("Datos de ración inválidos");

  const ingredients = await prisma.feedIngredient.findMany();
  const items = ingredients
    .map((ing) => ({ ingredientId: ing.id, percentage: num(formData.get(`pct_${ing.id}`)) }))
    .filter((it) => it.percentage > 0);

  const effectiveFrom = date(formData.get("effectiveFrom"));
  // Versionado: la ración vigente del lote se "cierra" al arrancar la nueva (no se pisa el histórico).
  await prisma.ration.updateMany({
    where: { lotId, effectiveTo: null },
    data: { effectiveTo: effectiveFrom },
  });
  await prisma.ration.create({
    data: {
      name,
      lotId,
      kgPerHeadDay,
      effectiveFrom,
      items: { create: items },
    },
  });
  clearFarmCache();
  revalidatePath("/alimentacion");
  redirect("/alimentacion");
}

// Cierra una campaña: congela los KPIs (stock, valor, costos, reparto por socio y precios
// vigentes) en una foto inmutable. No se recalcula después aunque cambien precios o socios.
export async function closeSeason(formData: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("No autorizado");
  const seasonId = str(formData.get("seasonId"));
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) throw new Error("Campaña no encontrada");
  if (season.closedAt) throw new Error("La campaña ya está cerrada");

  const [lots, prices, economy, split, movs] = await Promise.all([
    getLots("ALL"),
    getSalePrices(),
    getEconomy("ALL"),
    getOwnerSplit("ALL"),
    prisma.movement.groupBy({
      by: ["type"],
      where: { date: { gte: season.startDate, lte: season.endDate } },
      _sum: { quantity: true, amount: true },
    }),
  ]);
  const byType = (t: string) => movs.find((m) => m.type === t)?._sum;
  const ownerSplit = split.owners.map((o) => ({ name: o.name, kg: o.kg, value: o.valueShare, margin: o.marginShare }));

  await prisma.$transaction([
    prisma.seasonClose.create({
      data: {
        seasonId,
        headCount: lots.reduce((a, l) => a + l.headCount, 0),
        totalKg: Math.round(lots.reduce((a, l) => a + l.headCount * l.avgWeight, 0)),
        herdValue: herdValue(lots, prices.byCat),
        salesQty: byType("SALE")?.quantity ?? 0,
        salesAmount: byType("SALE")?.amount ?? 0,
        purchasesQty: byType("PURCHASE")?.quantity ?? 0,
        purchasesAmount: byType("PURCHASE")?.amount ?? 0,
        feedCost: Math.round(economy.rows.reduce((a, r) => a + r.feedCost, 0)),
        vetCost: Math.round(economy.rows.reduce((a, r) => a + r.vetCost, 0)),
        margin: split.owners.reduce((a, o) => a + o.marginShare, 0),
        prices: prices.byCat,
        ownerSplit,
      },
    }),
    prisma.season.update({ where: { id: seasonId }, data: { closedAt: new Date(), isCurrent: false } }),
  ]);
  clearFarmCache();
  revalidatePath("/historico");
  redirect("/historico");
}

export async function createSeason(formData: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("No autorizado");
  const name = str(formData.get("name"));
  if (!name) throw new Error("Falta el nombre de la campaña");
  const startDate = date(formData.get("startDate"));
  const endDate = date(formData.get("endDate"));
  if (endDate < startDate) throw new Error("La fecha de fin debe ser posterior al inicio");
  const makeCurrent = str(formData.get("isCurrent")) === "on";

  if (makeCurrent) await prisma.season.updateMany({ data: { isCurrent: false } });
  await prisma.season.create({
    data: { name, startDate, endDate, isCurrent: makeCurrent, farmId: await farmId() },
  });
  clearFarmCache();
  revalidatePath("/historico");
  redirect("/historico");
}

export async function createTreatment(formData: FormData) {
  await requireUser();
  const lotId = str(formData.get("lotId"));
  const name = str(formData.get("name"));
  if (!lotId || !name) throw new Error("Datos de tratamiento inválidos");

  await prisma.treatment.create({
    data: {
      lotId,
      name,
      type: str(formData.get("type")) || "OTHER",
      status: str(formData.get("status")) || "SCHEDULED",
      date: date(formData.get("date")),
      withdrawalDays: Math.round(num(formData.get("withdrawalDays"))),
      cost: Math.round(num(formData.get("cost"))),
    },
  });
  clearFarmCache();
  revalidatePath("/sanidad");
  redirect("/sanidad");
}

// Evento de manejo (vacunación, tacto, destete, etc.). Registro flexible.
export async function createHerdEvent(formData: FormData) {
  await requireUser();
  const lotId = str(formData.get("lotId"));
  const type = str(formData.get("type"));
  if (!lotId || !type) throw new Error("Datos del evento inválidos");
  const headCount = str(formData.get("headCount"));
  const value = str(formData.get("value"));

  await prisma.herdEvent.create({
    data: {
      lotId,
      type,
      date: date(formData.get("date")),
      headCount: headCount ? Math.round(num(headCount)) : null,
      value: value ? num(value) : null,
      note: str(formData.get("note")) || null,
    },
  });
  clearFarmCache();
  revalidatePath("/sanidad");
  redirect("/sanidad");
}

// Gasto detallado (hoy de sanidad). Se refleja en el costo veterinario de Economía.
export async function createExpense(formData: FormData) {
  await requireUser();
  const concept = str(formData.get("concept"));
  const amount = Math.round(num(formData.get("amount")));
  if (!concept || amount <= 0) throw new Error("Datos del gasto inválidos");

  await prisma.expense.create({
    data: {
      date: date(formData.get("date")),
      category: str(formData.get("category")) || "SANIDAD",
      concept,
      amount,
      lotId: str(formData.get("lotId")) || null,
      farmId: await farmId(),
    },
  });
  clearFarmCache();
  revalidatePath("/sanidad");
  revalidatePath("/economia");
  revalidatePath("/");
  redirect("/sanidad");
}

export async function createOwner(formData: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("No autorizado");
  const name = str(formData.get("name"));
  const globalPct = Math.round(num(formData.get("globalPct")));
  if (!name) throw new Error("Falta el nombre del socio");

  const owner = await prisma.owner.create({ data: { name, farmId: await farmId() } });
  if (globalPct > 0) {
    await prisma.share.create({ data: { ownerId: owner.id, lotId: null, sharePct: globalPct } });
  }
  clearFarmCache();
  revalidatePath("/socios");
  redirect("/socios");
}

// Define la participación por lote (override). Recibe share_<ownerId> por cada socio.
export async function setLotShares(formData: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("No autorizado");
  const lotId = str(formData.get("lotId"));
  if (!lotId) throw new Error("Falta el lote");

  const owners = await prisma.owner.findMany();
  await prisma.share.deleteMany({ where: { lotId } });
  const data = owners
    .map((o) => ({ ownerId: o.id, lotId, sharePct: Math.round(num(formData.get(`share_${o.id}`))) }))
    .filter((s) => s.sharePct > 0);
  if (data.length > 0) await prisma.share.createMany({ data });

  clearFarmCache();
  revalidatePath("/socios");
  redirect("/socios");
}

// Precio manual de venta por categoría: pisa al automático del mercado.
// price <= 0 borra el override → vuelve a regir el precio automático.
export async function setSalePrice(formData: FormData) {
  const user = await requireUser();
  if (!canManage(user.role)) throw new Error("No autorizado");
  const category = str(formData.get("category"));
  const price = Math.round(num(formData.get("pricePerKg")));
  if (!category) throw new Error("Falta la categoría");

  if (price > 0) {
    await prisma.priceSetting.upsert({
      where: { category },
      update: { pricePerKg: price },
      create: { category, pricePerKg: price },
    });
  } else {
    await prisma.priceSetting.deleteMany({ where: { category } });
  }
  clearFarmCache();
  revalidatePath("/economia");
  revalidatePath("/");
  redirect("/economia");
}

// Egreso de animales: venta o baja. Marca N animales activos del lote como egresados
// (no se borran: guardan fecha, peso y precio de salida) y registra el movimiento.
export async function registerExit(formData: FormData) {
  await requireUser();
  const lotId = str(formData.get("lotId"));
  const kind = str(formData.get("kind")); // SALE | DEATH
  const quantity = Math.round(num(formData.get("quantity")));
  const pricePerKg = Math.round(num(formData.get("pricePerKg")));
  const when = date(formData.get("date"));
  if (!lotId || !["SALE", "DEATH"].includes(kind) || quantity < 1) throw new Error("Datos de egreso inválidos");

  const animals = await prisma.animal.findMany({
    where: { lotId, status: "ACTIVE" },
    include: { weighings: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { tag: "asc" },
    take: quantity,
  });
  if (animals.length < quantity) throw new Error(`El lote solo tiene ${animals.length} animales activos`);

  const status = kind === "SALE" ? "SOLD" : "DEAD";
  let total = 0;
  const updates = animals.map((a) => {
    const w = a.weighings[0]?.weightKg ?? 0;
    const price = kind === "SALE" ? Math.round(w * pricePerKg) : 0;
    total += price;
    return prisma.animal.update({
      where: { id: a.id },
      data: { status, exitDate: when, exitReason: status, exitWeightKg: w, exitPriceArs: price },
    });
  });

  await prisma.$transaction([
    ...updates,
    prisma.movement.create({
      data: { lotId, type: kind, quantity: animals.length, amount: total, date: when, note: kind === "SALE" ? `Venta a $${pricePerKg}/kg` : "Baja" },
    }),
  ]);
  clearFarmCache();
  revalidatePath("/lotes");
  revalidatePath("/");
  redirect("/lotes");
}

export async function createMovement(formData: FormData) {
  await requireUser();
  const lotId = str(formData.get("lotId"));
  const type = str(formData.get("type"));
  const quantity = Math.round(num(formData.get("quantity")));
  if (!lotId || !type || quantity <= 0) throw new Error("Datos de movimiento inválidos");

  await prisma.movement.create({
    data: {
      lotId,
      type,
      quantity,
      amount: Math.round(num(formData.get("amount"))),
      date: date(formData.get("date")),
      note: str(formData.get("note")) || null,
    },
  });
  clearFarmCache();
  revalidatePath("/lotes");
  redirect("/lotes");
}
