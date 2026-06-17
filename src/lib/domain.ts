// Constantes y fórmulas del dominio ganadero.
// Centralizadas acá para que UI, API y seed compartan la misma lógica.

export const CATEGORIES = {
  STEER: { key: "STEER", label: "Novillo", plural: "Novillos" },
  COW: { key: "COW", label: "Vaca", plural: "Vacas" },
  CALF: { key: "CALF", label: "Ternero", plural: "Terneros" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const ROLES = {
  OWNER: "Dueño",
  MANAGER: "Encargado",
  WORKER: "Peón",
} as const;

export const INGREDIENT_TYPES = {
  CARB: "Hidratos",
  FIBER: "Fibra",
  PROTEIN: "Proteína",
} as const;

export const TREATMENT_TYPES = {
  VACCINE: "Vacuna",
  ANTIPARASITIC: "Antiparasitario",
  VITAMIN: "Vitamínico",
  OTHER: "Otro",
} as const;

export const EVENT_TYPES = {
  VACCINATION: "Vacunación",
  PALPATION: "Tacto",
  WEANING: "Destete",
  CASTRATION: "Castración",
  BRANDING: "Señalada / Marcación",
  OTHER: "Otro",
} as const;

// Pista de qué representa el "valor" numérico según el tipo de evento.
export const EVENT_VALUE_HINT: Record<string, string> = {
  VACCINATION: "Dosis aplicadas (opcional)",
  PALPATION: "% de preñez",
  WEANING: "Peso promedio al destete (kg)",
  CASTRATION: "—",
  BRANDING: "—",
  OTHER: "Dato (opcional)",
};

export const EXPENSE_CATEGORIES = {
  SANIDAD: "Sanidad",
  ALIMENTO: "Alimento",
  PERSONAL: "Personal",
  INFRAESTRUCTURA: "Infraestructura",
  SERVICIOS: "Servicios",
  OTRO: "Otro",
} as const;

export const MOVEMENT_TYPES = {
  PURCHASE: "Compra",
  SALE: "Venta",
  BIRTH: "Nacimiento",
  DEATH: "Muerte",
  RECATEGORIZATION: "Recategorización",
} as const;

export function categoryLabel(key: string): string {
  return CATEGORIES[key as CategoryKey]?.label ?? key;
}

// --- Fórmulas ---

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / MS_PER_DAY));
}

/** Ganancia Diaria de Peso (kg/día) entre dos pesajes. */
export function dailyGain(prevKg: number, currKg: number, prevDate: Date, currDate: Date): number {
  const d = daysBetween(prevDate, currDate);
  if (d === 0) return 0;
  return (currKg - prevKg) / d;
}

/** Proyección de peso a una fecha futura, dado un peso actual y una GDP. */
export function projectWeight(currentKg: number, gdp: number, fromDate: Date, toDate: Date): number {
  return currentKg + gdp * daysBetween(fromDate, toDate);
}

/** Fecha estimada en que se alcanza un peso objetivo al ritmo de GDP. */
export function projectDateForTarget(currentKg: number, targetKg: number, gdp: number, fromDate: Date): Date | null {
  if (gdp <= 0 || targetKg <= currentKg) return null;
  const days = Math.ceil((targetKg - currentKg) / gdp);
  return new Date(fromDate.getTime() + days * MS_PER_DAY);
}

/** Materia seca total de una dieta a partir de sus ítems (% por ingrediente). */
export function dietDryMatterPct(items: { percentage: number; dryMatterPct: number }[]): number {
  return items.reduce((acc, it) => acc + (it.percentage / 100) * it.dryMatterPct, 0);
}

/** Proteína bruta ponderada de la dieta. */
export function dietProteinPct(items: { percentage: number; proteinPct: number }[]): number {
  return items.reduce((acc, it) => acc + (it.percentage / 100) * it.proteinPct, 0);
}

/** Consumo de materia seca por día (kg) a partir de la ración tal cual y su % MS. */
export function dryMatterIntake(kgPerHeadDay: number, dietDryMatter: number): number {
  return kgPerHeadDay * (dietDryMatter / 100);
}

/** Consumo de MS como % del peso vivo. */
export function dmiAsBodyWeightPct(dmiKg: number, liveWeightKg: number): number {
  if (liveWeightKg === 0) return 0;
  return (dmiKg / liveWeightKg) * 100;
}

/** Conversión alimenticia: kg de MS consumida por kg ganado. */
export function feedConversion(dmiKgTotal: number, kgGained: number): number {
  if (kgGained <= 0) return 0;
  return dmiKgTotal / kgGained;
}

/** Costo de la ración por cabeza por día (ARS). */
export function rationCostPerDay(
  kgPerHeadDay: number,
  items: { percentage: number; costPerKg: number }[],
): number {
  const costPerKgMix = items.reduce((acc, it) => acc + (it.percentage / 100) * it.costPerKg, 0);
  return Math.round(kgPerHeadDay * costPerKgMix);
}

export function formatARS(n: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

export function formatKg(n: number, decimals = 0): string {
  return `${n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} kg`;
}
