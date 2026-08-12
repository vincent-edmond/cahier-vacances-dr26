"use client";

import { useEffect } from "react";

/**
 * Compte une vue de LP par variante A/B, UNIQUEMENT pour les visiteurs DANS le test.
 * Le test est ciblé Meta : le proxy ne pose le cookie `ab_lp` qu'au trafic Meta. Donc
 * cookie présent = visiteur du test (Meta) → on compte ; cookie absent (email / organique
 * / direct, servis en LP A) → on ne compte rien, pour que le taux d'opt-in dans /admin
 * reflète le trafic Meta uniquement. Une seule fois par session navigateur.
 */
export function AbView({ variant }: { variant: "A" | "B" }) {
  useEffect(() => {
    try {
      // Le cookie fait foi (posé par le proxy au seul trafic Meta).
      const cookieVariant = document.cookie.match(/(?:^|;\s*)ab_lp=([AB])/)?.[1];
      if (cookieVariant !== "A" && cookieVariant !== "B") return; // hors test → pas de comptage
      const key = "cdv_ab_viewed";
      if (sessionStorage.getItem(key) === cookieVariant) return;
      sessionStorage.setItem(key, cookieVariant);
      fetch("/api/ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant: cookieVariant }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* indisponible : on ignore */
    }
  }, [variant]);
  return null;
}
