"use client";

import { useFormStatus } from "react-dom";

// Botón de envío que se deshabilita y muestra un spinner mientras la server action está en curso.
export function SubmitButton({ label, pendingLabel = "Guardando…" }: { label: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn"
      disabled={pending}
      aria-busy={pending}
      style={{ justifyContent: "center", width: "100%", gap: 8, opacity: pending ? 0.85 : 1, cursor: pending ? "wait" : "pointer" }}
    >
      {pending && <span className="spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}
