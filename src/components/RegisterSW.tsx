"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    // Solo en producción: en desarrollo el SW cachea estáticos y sirve versiones viejas.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
