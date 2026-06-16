"use client";

import { useState } from "react";
import { setSalePrice } from "@/lib/actions/crud";
import { SubmitButton } from "@/components/SubmitButton";

const inputStyle: React.CSSProperties = {
  height: 32,
  width: 96,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  fontSize: 13,
};

// Botón por categoría para fijar (o editar) el precio a mano. Despliega un input inline.
export function SetPriceButton({
  category,
  currentPrice,
  isManual,
}: {
  category: string;
  currentPrice: number;
  isManual: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn"
        style={{ height: 32, fontSize: 12 }}
        onClick={() => setOpen(true)}
      >
        {isManual ? "Editar precio" : "Fijar precio a mano"}
      </button>
    );
  }

  return (
    <form action={setSalePrice} style={{ display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
      <input type="hidden" name="category" value={category} />
      <input
        name="pricePerKg"
        type="number"
        min="0"
        step="1"
        defaultValue={currentPrice}
        autoFocus
        title="0 = volver al precio automático"
        style={inputStyle}
      />
      <SubmitButton label="Guardar" block={false} />
      <button
        type="button"
        className="icon-btn"
        style={{ width: 32, height: 32 }}
        aria-label="Cancelar"
        onClick={() => setOpen(false)}
      >
        ✕
      </button>
    </form>
  );
}
