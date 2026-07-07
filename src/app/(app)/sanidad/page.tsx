import Link from "next/link";
import { parseCat } from "@/lib/cat";
import { getTreatments, getHerdEvents, getExpenses } from "@/lib/queries";
import { formatARS, TREATMENT_TYPES, EVENT_TYPES, EXPENSE_CATEGORIES } from "@/lib/domain";
import { CatFilter } from "@/components/CatFilter";
import { MiniBars, type MiniBar } from "@/components/MiniBars";
import { IconHealth, IconList, IconCash, IconArrowRight } from "@/components/icons";

const PALETTE = ["var(--olive)", "#97C459", "#EF9F27", "#85B7EB", "#c9bdd7", "#c9a24f"];

function compactARS(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 0 })}k`;
  return `$${n}`;
}

function PreviewCard({ href, icon, title, subtitle, bars, fmt }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bars: MiniBar[];
  fmt?: (n: number) => string;
}) {
  const hasData = bars.some((b) => b.value > 0);
  return (
    <Link href={href} className="card" style={{ display: "flex", flexDirection: "column", gap: 14, textDecoration: "none", color: "inherit", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: "#eef0e6", color: "var(--olive)", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
        <span style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ minHeight: 92, display: "flex", alignItems: "flex-end" }}>
        {hasData ? (
          <div style={{ width: "100%" }}><MiniBars items={bars} fmt={fmt} /></div>
        ) : (
          <div style={{ width: "100%", textAlign: "center", fontSize: 12, color: "var(--text-tertiary)", paddingBottom: 24 }}>Sin datos todavía</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 11 }}>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{subtitle}</span>
        <span style={{ fontSize: 12, color: "var(--olive)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
          Ver detalle <IconArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

export default async function SanidadPage({ searchParams }: { searchParams: Promise<{ cat?: string; season?: string }> }) {
  const sp = await searchParams;
  const cat = parseCat(sp.cat);
  const q = sp.season ? `?season=${sp.season}` : "";
  const [treatments, events, expenses] = await Promise.all([
    getTreatments(cat, sp.season),
    getHerdEvents(cat, sp.season),
    getExpenses(cat, sp.season),
  ]);

  // Tratamientos por tipo
  const treatBars: MiniBar[] = Object.entries(TREATMENT_TYPES).map(([k, label], i) => ({
    label,
    value: treatments.filter((t) => t.type === k).length,
    color: PALETTE[i % PALETTE.length],
  }));
  // Eventos por tipo (solo los que tienen registros)
  const eventBars: MiniBar[] = Object.entries(EVENT_TYPES)
    .map(([k, label], i) => ({ label, value: events.filter((e) => e.type === k).length, color: PALETTE[i % PALETTE.length] }))
    .filter((b) => b.value > 0);
  // Gastos por categoría (por monto)
  const gastoBars: MiniBar[] = Object.entries(EXPENSE_CATEGORIES)
    .map(([k, label], i) => ({ label, value: expenses.filter((e) => e.category === k).reduce((a, e) => a + e.amount, 0), color: PALETTE[i % PALETTE.length] }))
    .filter((b) => b.value > 0);

  const sanit = expenses.filter((e) => e.category === "SANIDAD").reduce((a, e) => a + e.amount, 0);
  const totalVet = treatments.reduce((a, t) => a + t.cost, 0) + sanit;
  const totalGastos = expenses.reduce((a, e) => a + e.amount, 0);

  return (
    <>
      <h2 className="section-title">Sanidad y manejo</h2>
      <p style={{ margin: "-8px 0 14px", fontSize: 13, color: "var(--text-tertiary)" }}>
        Un vistazo a cada módulo. Tocá una tarjeta para ver el detalle y cargar registros.
      </p>

      <CatFilter />

      <div className="grid g3">
        <PreviewCard
          href={`/sanidad/tratamientos${q}`}
          icon={<IconHealth size={17} />}
          title="Tratamientos"
          subtitle={`${treatments.length} · vet. ${compactARS(totalVet)}`}
          bars={treatBars}
        />
        <PreviewCard
          href={`/sanidad/eventos${q}`}
          icon={<IconList size={17} />}
          title="Eventos de manejo"
          subtitle={`${events.length} eventos`}
          bars={eventBars}
        />
        <PreviewCard
          href={`/sanidad/gastos${q}`}
          icon={<IconCash size={17} />}
          title="Gastos"
          subtitle={`${compactARS(totalGastos)} en total`}
          bars={gastoBars}
          fmt={compactARS}
        />
      </div>
    </>
  );
}
