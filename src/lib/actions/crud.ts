"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth";
import { clearFarmCache } from "@/lib/queries";

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

export async function createAnimal(formData: FormData) {
  await requireUser();
  const tag = str(formData.get("tag"));
  const lotId = str(formData.get("lotId"));
  if (!tag || !lotId) throw new Error("Datos de animal inválidos");

  const lot = await prisma.lot.findUnique({ where: { id: lotId } });
  if (!lot) throw new Error("Lote no encontrado");

  await prisma.animal.create({
    data: {
      tag,
      rfid: str(formData.get("rfid")) || null,
      category: lot.category,
      sex: str(formData.get("sex")) || null,
      lotId,
    },
  });
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

  await prisma.ration.create({
    data: {
      name,
      lotId,
      kgPerHeadDay,
      effectiveFrom: date(formData.get("effectiveFrom")),
      items: { create: items },
    },
  });
  clearFarmCache();
  revalidatePath("/alimentacion");
  redirect("/alimentacion");
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
