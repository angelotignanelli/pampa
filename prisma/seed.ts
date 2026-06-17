// Datos sintéticos para Campo Digital.
// Genera un establecimiento con 3 lotes (novillos, terneros, vacas), animales con
// historial de pesajes mensuales realistas, raciones, tratamientos y movimientos.

import { PrismaClient } from "../src/generated/prisma";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// Contraseña de demo para los 3 usuarios sembrados.
const DEMO_PASSWORD = "campo1234";

// Generador pseudoaleatorio determinístico (seed fijo) para datos reproducibles.
let seedState = 42;
function rand(): number {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function randBetween(min: number, max: number): number {
  return min + rand() * (max - min);
}

function monthsAgo(n: number): Date {
  const d = new Date("2026-06-01T12:00:00Z");
  d.setMonth(d.getMonth() - n);
  return d;
}

async function main() {
  // Limpieza (orden por dependencias)
  await prisma.share.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.weighing.deleteMany();
  await prisma.rationItem.deleteMany();
  await prisma.ration.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.movement.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.paddock.deleteMany();
  await prisma.feedIngredient.deleteMany();
  await prisma.marketPrice.deleteMany();
  await prisma.priceSetting.deleteMany();
  await prisma.sourceStatus.deleteMany();
  await prisma.season.deleteMany();
  await prisma.user.deleteMany();
  await prisma.farm.deleteMany();

  const farm = await prisma.farm.create({
    data: { name: "Establecimiento La Esperanza", location: "Carlos Casares, Buenos Aires", hectares: 680 },
  });

  const pw = hashPassword(DEMO_PASSWORD);
  const owner = await prisma.user.create({
    data: { name: "Juan Pérez", email: "juan@laesperanza.ar", passwordHash: pw, role: "OWNER", farmId: farm.id },
  });
  await prisma.user.create({
    data: { name: "Marcos Gómez", email: "marcos@laesperanza.ar", passwordHash: pw, role: "MANAGER", farmId: farm.id },
  });
  await prisma.user.create({
    data: { name: "Luis Sosa", email: "luis@laesperanza.ar", passwordHash: pw, role: "WORKER", farmId: farm.id },
  });

  const p1 = await prisma.paddock.create({ data: { name: "Potrero Norte", hectares: 120, farmId: farm.id } });
  const p2 = await prisma.paddock.create({ data: { name: "Potrero del Monte", hectares: 90, farmId: farm.id } });
  const p3 = await prisma.paddock.create({ data: { name: "Potrero Laguna", hectares: 150, farmId: farm.id } });

  // Ingredientes del mixer
  const maiz = await prisma.feedIngredient.create({
    data: { name: "Maíz", type: "CARB", dryMatterPct: 87, proteinPct: 8, energyMcal: 3.3, costPerKg: 180 },
  });
  const silo = await prisma.feedIngredient.create({
    data: { name: "Silo de maíz", type: "FIBER", dryMatterPct: 35, proteinPct: 7, energyMcal: 2.5, costPerKg: 90 },
  });
  const soja = await prisma.feedIngredient.create({
    data: { name: "Expeller de soja", type: "PROTEIN", dryMatterPct: 90, proteinPct: 42, energyMcal: 3.2, costPerKg: 360 },
  });

  // Definición de lotes: categoría, cantidad, peso inicial, GDP base, potrero
  const lotDefs = [
    { name: "Novillos 03", category: "STEER", count: 24, startKg: 280, gdp: 1.28, paddockId: p1.id, mix: { [maiz.id]: 50, [silo.id]: 30, [soja.id]: 20 } },
    { name: "Terneros A", category: "CALF", count: 30, startKg: 150, gdp: 0.95, paddockId: p2.id, mix: { [maiz.id]: 35, [silo.id]: 45, [soja.id]: 20 } },
    { name: "Vientres 01", category: "COW", count: 20, startKg: 410, gdp: 0.42, paddockId: p3.id, mix: { [maiz.id]: 20, [silo.id]: 65, [soja.id]: 15 } },
  ];

  let tagSeq = 400;

  for (const def of lotDefs) {
    const lot = await prisma.lot.create({
      data: { name: def.name, category: def.category, farmId: farm.id, paddockId: def.paddockId },
    });

    // Ración del lote
    const ration = await prisma.ration.create({
      data: {
        name: `Mixer ${def.name}`,
        effectiveFrom: monthsAgo(3),
        kgPerHeadDay: def.category === "COW" ? 7.5 : def.category === "CALF" ? 6.0 : 9.5,
        lotId: lot.id,
        createdById: owner.id,
      },
    });
    for (const [ingredientId, percentage] of Object.entries(def.mix)) {
      await prisma.rationItem.create({ data: { rationId: ration.id, ingredientId, percentage } });
    }

    // Animales con 4 pesajes mensuales (Mar, Abr, May, Jun)
    for (let i = 0; i < def.count; i++) {
      tagSeq += 1;
      const tag = `AR-${String(tagSeq).padStart(4, "0")}`;
      const animal = await prisma.animal.create({
        data: {
          tag,
          rfid: `982000${String(tagSeq).padStart(9, "0")}`,
          category: def.category,
          sex: def.category === "COW" ? "F" : rand() > 0.5 ? "M" : "F",
          birthDate: monthsAgo(def.category === "CALF" ? 8 : def.category === "STEER" ? 18 : 48),
          status: "ACTIVE",
          lotId: lot.id,
        },
      });

      let weight = def.startKg + randBetween(-12, 12);
      for (let m = 3; m >= 0; m--) {
        // ganancia mensual ≈ GDP * 30, con variación por animal
        if (m < 3) weight += def.gdp * 30 * randBetween(0.75, 1.2);
        await prisma.weighing.create({
          data: {
            weightKg: Math.round(weight * 10) / 10,
            date: monthsAgo(m),
            animalId: animal.id,
            lotId: lot.id,
            createdById: owner.id,
          },
        });
      }
    }

    // Tratamiento sanitario
    await prisma.treatment.create({
      data: {
        name: "Vacuna aftosa",
        type: "VACCINE",
        date: monthsAgo(0),
        status: "DONE",
        withdrawalDays: 0,
        cost: def.count * 1200,
        lotId: lot.id,
        createdById: owner.id,
      },
    });

    // Movimiento de alta (compra o nacimiento)
    await prisma.movement.create({
      data: {
        type: def.category === "CALF" ? "BIRTH" : "PURCHASE",
        quantity: def.count,
        amount: def.category === "CALF" ? 0 : def.count * def.startKg * 1800,
        date: monthsAgo(3),
        note: "Alta inicial del lote",
        lotId: lot.id,
        createdById: owner.id,
      },
    });
  }

  // Socios y participaciones (demo)
  const juan = await prisma.owner.create({ data: { name: "Juan Pérez", farmId: farm.id } });
  const sofia = await prisma.owner.create({ data: { name: "Sofía Gómez", farmId: farm.id } });
  // Participación global por defecto: Juan 60% / Sofía 40%
  await prisma.share.createMany({
    data: [
      { ownerId: juan.id, lotId: null, sharePct: 60 },
      { ownerId: sofia.id, lotId: null, sharePct: 40 },
    ],
  });
  // Override por lote: en "Novillos 03" van 50/50
  const novillos = await prisma.lot.findFirst({ where: { name: "Novillos 03" } });
  if (novillos) {
    await prisma.share.createMany({
      data: [
        { ownerId: juan.id, lotId: novillos.id, sharePct: 50 },
        { ownerId: sofia.id, lotId: novillos.id, sharePct: 50 },
      ],
    });
  }

  // Cotización inicial (valores reales del Mercado de Cañuelas al 16/06/2026).
  // El cron diario va sumando registros nuevos; estos sirven de arranque y de respaldo.
  const cotizDate = new Date(2026, 5, 16); // 16/06/2026 hora local (evita corrimiento por UTC)
  await prisma.marketPrice.createMany({
    data: [
      { source: "MAG_CANUELAS", category: "STEER", label: "Novillos", pricePerKg: 4468, refDate: cotizDate },
      { source: "MAG_CANUELAS", category: "COW", label: "Vacas", pricePerKg: 2629, refDate: cotizDate },
    ],
  });
  await prisma.sourceStatus.create({
    data: { source: "MAG_CANUELAS", ok: true, lastOkAt: cotizDate, lastTryAt: cotizDate },
  });

  // Campaña actual (ciclo julio→junio, típico en ganadería). El histórico se arma a partir de acá.
  await prisma.season.create({
    data: {
      name: "Campaña 2025/26",
      startDate: new Date(2025, 6, 1), // 01/07/2025
      endDate: new Date(2026, 5, 30), // 30/06/2026
      isCurrent: true,
      farmId: farm.id,
    },
  });

  const totals = {
    animales: await prisma.animal.count(),
    pesajes: await prisma.weighing.count(),
    lotes: await prisma.lot.count(),
    socios: await prisma.owner.count(),
  };
  console.log("Seed completo:", totals);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
