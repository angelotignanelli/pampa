"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import { LinkSpinner } from "@/components/LinkSpinner";
import type { SessionUser } from "@/lib/auth";
import {
  IconDashboard,
  IconScale,
  IconBowl,
  IconHealth,
  IconCash,
  IconList,
  IconUsers,
  IconLeaf,
  IconBell,
  IconHistory,
  IconLogout,
} from "@/components/icons";

const ROLE_LABEL: Record<string, string> = { OWNER: "Dueño", MANAGER: "Encargado", WORKER: "Peón" };
type SeasonOption = { id: string; name: string; isCurrent: boolean; closed: boolean };

const NAV = [
  { href: "/", label: "Resumen", Icon: IconDashboard, badge: "" },
  { href: "/pesajes", label: "Pesajes", Icon: IconScale, badge: "pesajes" },
  { href: "/alimentacion", label: "Alimentación", Icon: IconBowl, badge: "" },
  { href: "/sanidad", label: "Sanidad", Icon: IconHealth, badge: "sanidad" },
  { href: "/economia", label: "Economía", Icon: IconCash, badge: "" },
  { href: "/lotes", label: "Lotes", Icon: IconList, badge: "" },
  { href: "/socios", label: "Socios", Icon: IconUsers, badge: "" },
  { href: "/historico", label: "Histórico", Icon: IconHistory, badge: "" },
];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const selectStyle: React.CSSProperties = {
  height: 32,
  padding: "0 28px 0 10px",
  borderRadius: 9,
  border: "1px solid var(--border-strong)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 500,
  appearance: "none",
  cursor: "pointer",
};

export function Shell({
  children,
  user,
  badges = {},
  priceAlert,
  seasons = [],
}: {
  children: React.ReactNode;
  user: SessionUser;
  badges?: Record<string, number>;
  priceAlert?: { failing: boolean; sourceName: string; lastOkAt: string | null };
  seasons?: SeasonOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();

  // Campaña = contexto global. Por defecto, la actual.
  const currentSeason = seasons.find((s) => s.isCurrent) ?? seasons[0];
  const selectedSeasonId = params.get("season") ?? currentSeason?.id ?? "";
  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);
  const isPastSeason = selectedSeason ? !selectedSeason.isCurrent : false;

  // El nav preserva la campaña elegida (no la categoría, que es un filtro in-page).
  const withSeason = (href: string) => {
    if (!selectedSeasonId || selectedSeason?.isCurrent) return href;
    return `${href}?season=${selectedSeasonId}`;
  };
  const onSeasonChange = (id: string) => {
    const isCurr = seasons.find((s) => s.id === id)?.isCurrent;
    const sp = new URLSearchParams(params.toString());
    if (isCurr) sp.delete("season");
    else sp.set("season", id);
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", gap: 14, padding: 14, background: "var(--bg-tertiary)" }}>
      {/* Sidebar */}
      <aside style={{ width: 248, flexShrink: 0, display: "flex", flexDirection: "column", gap: 18, padding: "8px 6px", position: "sticky", top: 14, alignSelf: "flex-start", height: "calc(100vh - 28px)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--olive)", color: "#f4f1e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconLeaf size={18} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Pampa</span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV.map(({ href, label, Icon, badge }) => {
            const active = pathname === href;
            const count = badge ? badges[badge] : 0;
            return (
              <Link key={href} href={withSeason(href)} className={`nav-item${active ? " active" : ""}`}>
                <Icon size={17} />
                {label}
                <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <LinkSpinner />
                  {count ? <span className="nav-badge" style={{ marginLeft: 0 }}>{count}</span> : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Tarjeta upgrade */}
        <div style={{ background: "var(--olive)", color: "#f4f1e8", borderRadius: "var(--radius-lg)", padding: 16 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(244,241,232,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <IconScale size={16} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 500 }}>Automatizá el pesaje</p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(244,241,232,0.7)", lineHeight: 1.5 }}>
            Conectá tu balanza o lector RFID y cargá pesajes sin escribir.
          </p>
          <button style={{ width: "100%", padding: "9px", borderRadius: 9, border: "none", background: "#f4f1e8", color: "var(--olive)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Conectar
          </button>
        </div>

        {/* Usuario */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px", borderTop: "1px solid var(--border)" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--info-bg)", color: "var(--info-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>
            {initials(user.name)}
          </div>
          <div style={{ lineHeight: 1.3, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--text-tertiary)" }}>{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
          <form action={logout} style={{ marginLeft: "auto" }}>
            <button type="submit" className="icon-btn" aria-label="Salir" style={{ width: 32, height: 32 }}>
              <IconLogout size={16} />
            </button>
          </form>
        </div>
      </aside>

      {/* Panel principal */}
      <div className="panel" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {priceAlert?.failing && pathname !== "/economia" && (
          <Link
            href="/economia"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 22px", background: "var(--warn-bg, #fcf3e3)", color: "var(--warn-text, #8a5a12)", borderBottom: "1px solid var(--border)", fontSize: 13, textDecoration: "none" }}
          >
            <IconBell size={16} />
            <span>
              No pudimos actualizar el precio de hacienda ({priceAlert.sourceName}). Estás viendo el último valor guardado.
            </span>
            <span style={{ marginLeft: "auto", fontWeight: 500, whiteSpace: "nowrap" }}>Ver Economía →</span>
          </Link>
        )}
        {seasons.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 22px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <IconHistory size={14} /> Campaña
              </span>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <select value={selectedSeasonId} onChange={(e) => onSeasonChange(e.target.value)} style={selectStyle} aria-label="Campaña">
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.isCurrent ? " · actual" : s.closed ? " · cerrada" : ""}</option>
                  ))}
                </select>
                <span style={{ position: "absolute", right: 10, pointerEvents: "none", color: "var(--text-tertiary)", fontSize: 10 }}>▾</span>
              </div>
              {isPastSeason && (
                <span className="pill" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>solo lectura</span>
              )}
            </div>
            <Link href="/historico" style={{ fontSize: 12, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              Gestionar campañas <LinkSpinner />
            </Link>
          </div>
        )}

        {isPastSeason && (
          <div style={{ padding: "9px 22px", background: "var(--warn-bg, #fcf3e3)", color: "var(--warn-text, #8a5a12)", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
            Estás viendo <strong>{selectedSeason?.name}</strong> — campaña pasada, solo lectura. Pesajes, Sanidad, Lotes y Economía muestran esa campaña; el Resumen se está habilitando.
          </div>
        )}

        <main style={{ flex: 1, minWidth: 0, padding: "24px 26px" }}>{children}</main>
      </div>
    </div>
  );
}
