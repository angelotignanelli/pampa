import type { CatFilter } from "@/lib/queries";

const VALID: CatFilter[] = ["ALL", "STEER", "COW", "CALF"];

export function parseCat(value?: string): CatFilter {
  return VALID.includes(value as CatFilter) ? (value as CatFilter) : "ALL";
}

export function gdpFmt(n: number): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pctFmt(n: number, decimals = 1): string {
  return n.toLocaleString("es-AR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function pillClass(category: string): string {
  return category === "STEER" ? "steer" : category === "CALF" ? "calf" : "cow";
}
