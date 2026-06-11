"use client";

import { useEffect } from "react";

/**
 * Capture l'attribution publicitaire (utm_*, gclid, fbclid) et la stocke en
 * localStorage. Montée dans le layout → s'exécute sur N'IMPORTE QUELLE page
 * d'entrée (un clic pub est toujours un chargement complet, donc remonte ici).
 *
 * - `cdv_attribution` : LAST-TOUCH — chaque nouvelle arrivée pub écrase. C'est ce
 *   qui part vers HubSpot + GTM à l'opt-in (on crédite le clic pub le plus récent,
 *   le bon pour l'optimisation Meta/Google).
 * - `cdv_attribution_first` : FIRST-TOUCH — l'origine, conservée si on en a besoin.
 *
 * Une navigation interne (sans paramètre pub) ne touche à rien : l'attribution
 * persiste jusqu'à l'opt-in, même plusieurs pages plus loin ou plus tard.
 */
const KEY = "cdv_attribution";
const KEY_FIRST = "cdv_attribution_first";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

export function UtmCapture() {
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const found: Record<string, string> = {};
      for (const p of PARAMS) {
        const v = sp.get(p);
        if (v) found[p] = v.slice(0, 512);
      }
      if (Object.keys(found).length === 0) return; // pas de tag pub → on ne touche à rien

      const record = JSON.stringify({
        ...found,
        landing: window.location.pathname,
        capturedAt: new Date().toISOString(),
      });
      localStorage.setItem(KEY, record); // last-touch : le dernier clic pub gagne
      if (!localStorage.getItem(KEY_FIRST)) localStorage.setItem(KEY_FIRST, record); // origine préservée
    } catch {
      /* non bloquant */
    }
  }, []);

  return null;
}
