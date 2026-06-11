"use client";

import { useEffect } from "react";

/**
 * Capture l'attribution publicitaire (utm_*, gclid, fbclid) au premier passage
 * et la stocke en localStorage (first-touch : on n'écrase pas une attribution
 * déjà capturée). Réutilisée à l'opt-in pour la faire remonter dans HubSpot.
 * Rend `null` : composant purement technique, monté sur la landing.
 */
const KEY = "cdv_attribution";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];

export function UtmCapture() {
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const found: Record<string, string> = {};
      for (const p of PARAMS) {
        const v = sp.get(p);
        if (v) found[p] = v;
      }
      if (Object.keys(found).length === 0) return;
      if (localStorage.getItem(KEY)) return; // first-touch : ne pas écraser
      localStorage.setItem(
        KEY,
        JSON.stringify({ ...found, landing: window.location.pathname, capturedAt: new Date().toISOString() })
      );
    } catch {
      /* pas bloquant */
    }
  }, []);

  return null;
}
