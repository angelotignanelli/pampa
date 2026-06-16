"use client";

import { useFormStatus } from "react-dom";

// Botón de envío que se deshabilita y muestra un spinner mientras la server action está en curso.
// block=true ocupa todo el ancho (formularios); block=false queda compacto (acciones inline).
export function SubmitButton({
  label,
  pendingLabel = "Guardando…",
  block = true,
}: {
  label: string;
  pendingLabel?: string;
  block?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn"
      disabled={pending}
      aria-busy={pending}
      style={{ justifyContent: "center", width: block ? "100%" : undefined, gap: 8, opacity: pending ? 0.85 : 1, cursor: pending ? "wait" : "pointer" }}
    >
      {pending && <span className="spin" />}
      {pending ? pendingLabel : label}
    </button>
  );
}
