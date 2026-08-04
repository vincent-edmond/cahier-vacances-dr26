"use client";

import { useEffect } from "react";

/**
 * Compte une vue de LP par variante A/B (une seule fois par session navigateur),
 * pour calculer le taux d'opt-in par variante dans /admin. Best-effort, silencieux.
 */
export function AbView({ variant }: { variant: "A" | "B" }) {
  useEffect(() => {
    try {
      const key = "cdv_ab_viewed";
      if (sessionStorage.getItem(key) === variant) return;
      sessionStorage.setItem(key, variant);
      fetch("/api/ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* sessionStorage indisponible : on ignore */
    }
  }, [variant]);
  return null;
}
