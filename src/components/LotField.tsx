"use client";

import { useState } from "react";
import { CATEGORIES, categoryLabel } from "@/lib/domain";

const inputStyle: React.CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-strong)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: 14,
  width: "100%",
};

type Lot = { id: string; name: string; category: string };
type Paddock = { id: string; name: string };

export function LotField({ lots, paddocks }: { lots: Lot[]; paddocks: Paddock[] }) {
  const [value, setValue] = useState("");
  const isNew = value === "__new__";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
        Lote
        <select name="lotId" required value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle}>
          <option value="" disabled>Elegí el lote…</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>{l.name} ({categoryLabel(l.category)})</option>
          ))}
          <option value="__new__">+ Crear lote nuevo…</option>
        </select>
      </label>

      {isNew && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12, borderRadius: "var(--radius-md)", border: "1px dashed var(--border-strong)", background: "var(--bg-secondary)" }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>Nuevo lote</p>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
            Nombre del lote
            <input name="newLotName" required={isNew} placeholder="Ej. Hembras 04" style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
            Categoría
            <select name="newLotCategory" required={isNew} defaultValue="" style={inputStyle}>
              <option value="" disabled>Elegí…</option>
              {Object.values(CATEGORIES).map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--text-secondary)" }}>
            Potrero (opcional)
            <select name="newLotPaddock" defaultValue="" style={inputStyle}>
              <option value="">Sin asignar</option>
              {paddocks.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
