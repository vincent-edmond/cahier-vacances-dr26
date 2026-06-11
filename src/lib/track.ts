// ─── Tracking GTM (server-side container) — couche client ───────────────────
// On pousse dans `dataLayer` ; le conteneur GTM web relaie vers GTM SS, qui
// fan-out vers Meta CAPI / Google Ads en server-side (dédup via `event_id`).
//
// Conversion optimisée = `generate_lead`, segmentée par `lead_quality`
// ('quali' ≥100K = celle qu'on optimise · 'classique' <100K).

import type { LeadQuality } from "@/lib/types";

type DLItem = Record<string, unknown>;

function dataLayer(): DLItem[] {
  if (typeof window === "undefined") return [];
  const w = window as unknown as { dataLayer?: DLItem[] };
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}

export function push(item: DLItem): void {
  try {
    dataLayer().push(item);
  } catch {
    /* non bloquant */
  }
}

/** Id de dédup partagé client (dataLayer) ↔ serveur (GTM SS). */
export function newEventId(): string {
  try {
    const c = (typeof crypto !== "undefined" ? crypto : undefined) as Crypto | undefined;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    /* fallback */
  }
  return `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function trackPageView(path: string): void {
  push({ event: "page_view", page_path: path });
}

export interface LeadPayload {
  eventId: string;
  leadQuality: LeadQuality;
  email: string;
  prenom?: string;
  phone?: string;
  ca?: string;
  secteur?: string;
}

/** Conversion d'opt-in. `lead_quality` → 2 conversions distinctes dans GTM SS. */
export function trackLead(p: LeadPayload): void {
  push({
    event: "generate_lead",
    event_id: p.eventId,
    lead_quality: p.leadQuality,
    currency: "EUR",
    email: p.email,
    prenom: p.prenom || undefined,
    phone: p.phone || undefined,
    ca_bracket: p.ca || undefined,
    secteur: p.secteur || undefined,
  });
}
