"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  IconFilter,
  IconSettings,
  IconBell,
  IconHeadset,
  IconLogout,
} from "@/components/icons";

const ROLE_LABEL: Record<string, string> = { OWNER: "Dueño", MANAGER: "Encargado", WORKER: "Peón" };

const NAV = [
  { href: "/", label: "Resumen", Icon: IconDashboard, badge: "" },
  { href: "/pesajes", label: "Pesajes", Icon: IconScale, badge: "pesajes" },
  { href: "/alimentacion", label: "Alimentación", Icon: IconBowl, badge: "" },
  { href: "/sanidad", label: "Sanidad", Icon: IconHealth, badge: "sanidad" },
  { href: "/economia", label: "Economía", Icon: IconCash, badge: "" },
  { href: "/lotes", label: "Lotes", Icon: IconList, badge: "" },
  { href: "/socios", label: "Socios", Icon: IconUsers, badge: "" },
];

const FILTERS = [
  { cat: "ALL", label: "Todos" },
  { cat: "STEER", label: "Novillos" },
  { cat: "COW", label: "Vacas" },
  { cat: "CALF", label: "Terneros" },
];

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function Shell({
  children,
  user,
  badges = {},
  priceAlert,
}: {
  children: React.ReactNode;
  user: SessionUser;
  badges?: Record<string, number>;
  priceAlert?: { failing: boolean; sourceName: string; lastOkAt: string | null };
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const cat = params.get("cat") ?? "ALL";

  const withCat = (href: string) => (cat === "ALL" ? href : `${href}?cat=${cat}`);
  const withFilter = (c: string) => (c === "ALL" ? pathname : `${pathname}?cat=${c}`);

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
              <Link key={href} href={withCat(href)} className={`nav-item${active ? " active" : ""}`}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "inline-flex", alignItems: "center", gap: 5, marginRight: 4 }}>
              <IconFilter size={14} /> Categoría
            </span>
            {FILTERS.map((f) => (
              <Link key={f.cat} href={withFilter(f.cat)} className={`chip${cat === f.cat ? " active" : ""}`}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {f.label}
                  <LinkSpinner />
                </span>
              </Link>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="icon-btn" aria-label="Soporte"><IconHeadset size={17} /></button>
            <button className="icon-btn" aria-label="Configuración"><IconSettings size={17} /></button>
            <button className="icon-btn" aria-label="Notificaciones"><IconBell size={17} /></button>
          </div>
        </div>

        <main style={{ flex: 1, minWidth: 0, padding: "24px 26px" }}>{children}</main>
      </div>
    </div>
  );
}
