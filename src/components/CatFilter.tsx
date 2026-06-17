"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LinkSpinner } from "@/components/LinkSpinner";
import { IconFilter } from "@/components/icons";

const FILTERS = [
  { cat: "ALL", label: "Todos" },
  { cat: "STEER", label: "Novillos" },
  { cat: "COW", label: "Vacas" },
  { cat: "CALF", label: "Terneros" },
];

// Filtro de tipo de animal, in-page (jerarquía menor que la campaña). Preserva el resto de params.
export function CatFilter() {
  const pathname = usePathname();
  const params = useSearchParams();
  const cat = params.get("cat") ?? "ALL";

  const hrefFor = (c: string) => {
    const sp = new URLSearchParams(params.toString());
    if (c === "ALL") sp.delete("cat");
    else sp.set("cat", c);
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5, marginRight: 2 }}>
        <IconFilter size={13} /> Tipo
      </span>
      {FILTERS.map((f) => (
        <Link key={f.cat} href={hrefFor(f.cat)} className={`chip${cat === f.cat ? " active" : ""}`}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {f.label}
            <LinkSpinner />
          </span>
        </Link>
      ))}
    </div>
  );
}
