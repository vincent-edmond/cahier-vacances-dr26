import capsulesData from "@/data/capsules.json";
import type { Capsule } from "@/lib/types";

const CAPSULES = capsulesData as Capsule[];

/** Lien d'inscription Destination Réussite (placeholder à confirmer). */
export const DR_URL = "https://www.maxpiccinini.com/destination-reussite/";

export function getCapsules(): Capsule[] {
  return CAPSULES;
}

export function getCapsule(num: number): Capsule | null {
  return CAPSULES.find((c) => c.num === num) ?? null;
}

export const TOTAL_CAPSULES = CAPSULES.length;

/**
 * Une capsule est débloquée si la date du jour a atteint sa date d'ouverture.
 * Le mode `preview` (dev / démo avant le 30/06) débloque tout.
 */
export function isUnlocked(capsule: Capsule, opts?: { preview?: boolean; now?: Date }): boolean {
  if (opts?.preview) return true;
  const now = opts?.now ?? new Date();
  const unlock = new Date(`${capsule.dateUnlock}T00:00:00`);
  return now.getTime() >= unlock.getTime();
}

const MOIS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Formate une date ISO (YYYY-MM-DD) en français : « 30 juin ». */
export function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MOIS_FR[m - 1]}`;
}
