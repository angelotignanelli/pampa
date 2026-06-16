// Cotización de hacienda desde el Mercado Agroganadero de Cañuelas (ex-Liniers).
// Fuente pública: tabla HTML estática de precios por categoría ($/kg vivo), actualizada a diario.
// Sin API oficial → parseo defensivo de la tabla. Si cambia el HTML, el cron falla y la app
// cae al último valor guardado (ver getSalePrices en queries.ts).
import type { CategoryKey } from "@/lib/domain";

export const PRICE_SOURCE = {
  code: "MAG_CANUELAS",
  name: "Mercado Agroganadero de Cañuelas",
  url: "https://www.mercadoagroganadero.com.ar/dll/hacienda1.dll/haciinfo000002",
} as const;

// Respaldo por si la fuente falla o todavía no corrió el cron. Nunca deja la app sin precio.
export const FALLBACK_PRICE: Record<CategoryKey, number> = { STEER: 4100, COW: 2600, CALF: 5000 };

export type ParsedPrice = { category: CategoryKey; label: string; pricePerKg: number; refDate: Date };

// "4.337,937" → 4337.937 ; "1.119" → 1119 (punto = miles, coma = decimal)
function parseNum(raw: string): number {
  const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
}

function catSourceLabel(cat: CategoryKey): string {
  return cat === "STEER" ? "Novillos" : cat === "COW" ? "Vacas" : "Terneros";
}

// Mapea cada fila de la fuente a una categoría de la app. null = se ignora.
// Cañuelas no cotiza terneros de invernada (eso es Rosgan) → CALF queda sin fuente automática.
function mapCategory(label: string): CategoryKey | null {
  const u = label.toUpperCase();
  if (u.startsWith("NOVILLOS") || u.startsWith("NOVILLITOS")) return "STEER";
  if (u.startsWith("VACAS")) return "COW";
  return null; // VAQUILLONAS, TOROS, MEJORADORES, etc. no entran en las 3 categorías de la app.
}

// "PRECIOS POR CATEGORIA DESDE EL MARTES 16/06/2026" → Date
function parseRefDate(html: string): Date {
  const m = html.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return new Date();
}

// Promedia (ponderado por cabezas) las subcategorías de la fuente dentro de cada categoría de la app.
export function parseCanuelas(html: string): ParsedPrice[] {
  const refDate = parseRefDate(html);
  const acc = new Map<CategoryKey, { sumPxH: number; heads: number }>();

  const rows = html.match(/<TR[^>]*>[\s\S]*?<\/TR>/gi) ?? [];
  for (const row of rows) {
    const cells = (row.match(/<TD[^>]*>[\s\S]*?<\/TD>/gi) ?? []).map((c) =>
      stripTags(c.replace(/<\/?TD[^>]*>/gi, "")),
    );
    if (cells.length < 6) continue; // encabezados (TH) o filas no-dato
    const cat = mapCategory(cells[0]);
    if (!cat) continue;
    const avg = parseNum(cells[3]); // columna Promedio
    const heads = parseNum(cells[5]); // columna Cabezas
    if (!(avg > 0) || !(heads > 0)) continue;
    const a = acc.get(cat) ?? { sumPxH: 0, heads: 0 };
    a.sumPxH += avg * heads;
    a.heads += heads;
    acc.set(cat, a);
  }

  const out: ParsedPrice[] = [];
  for (const [cat, a] of acc) {
    out.push({ category: cat, label: catSourceLabel(cat), pricePerKg: Math.round(a.sumPxH / a.heads), refDate });
  }
  return out;
}

export async function fetchCanuelasPrices(): Promise<ParsedPrice[]> {
  const res = await fetch(PRICE_SOURCE.url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Pampa/1.0)" },
  });
  if (!res.ok) throw new Error(`La fuente respondió ${res.status}`);
  const parsed = parseCanuelas(await res.text());
  if (parsed.length === 0) throw new Error("No se pudo parsear ninguna categoría de la fuente");
  return parsed;
}
