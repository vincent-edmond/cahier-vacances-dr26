"use client";

import { useEffect } from "react";
import { getOrCreateSessionId, getAttribution } from "@/lib/session";

const THROTTLE_KEY = "cdv_visit_ping";
const THROTTLE_MS = 5 * 60 * 1000; // au plus 1 ping / 5 min côté client (le serveur gère le décompte des visites)

/**
 * Enregistre l'entrée du visiteur dans le SaaS (montée dans le layout /espace).
 * Décompte type Google Analytics côté serveur (cf. cdv.touch_session) :
 * visiteur unique = 1 session navigateur, visite = +1 après 30 min d'inactivité.
 */
export function SessionPing() {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    if (!sessionId) return;

    // Throttle local : évite un write à chaque navigation interne.
    const last = Number(localStorage.getItem(THROTTLE_KEY) || 0);
    if (Date.now() - last < THROTTLE_MS) return;
    localStorage.setItem(THROTTLE_KEY, String(Date.now()));

    const source = getAttribution()?.utm_source;
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, source }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
