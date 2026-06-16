"use client";

import { useLinkStatus } from "next/link";

// Spinner que aparece dentro de un <Link> mientras esa navegación está pendiente.
export function LinkSpinner() {
  const { pending } = useLinkStatus();
  return pending ? <span className="spin" aria-label="Cargando" /> : null;
}
