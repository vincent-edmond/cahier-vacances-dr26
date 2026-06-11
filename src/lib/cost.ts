// ─── Coût de l'inaction (« taxe stupide ») ──────────────────────────────────
// Estimation INDICATIVE du manque à gagner d'un levier laissé en l'état, calée
// sur la taille de l'entreprise (tranche de CA de l'opt-in).
//
// Choix d'ingénierie : le chiffre est DÉTERMINISTE (impact %/CA par levier ×
// CA représentatif), pas généré par l'IA à chaque appel — sinon il varierait à
// chaque envoi et perdrait toute crédibilité. Les pourcentages ci-dessous sont
// les « benchmarks » (ajustables) ; la fourchette assume l'incertitude.

import { TOTAL_CAPSULES } from "@/lib/capsules";

/** CA représentatif (€/an) d'une tranche d'opt-in. `null` = pas chiffrable. */
export function caToRevenue(ca?: string): number | null {
  switch (ca) {
    case "0 à 30 000€ de C.A annuel": return 20000;
    case "30 000€ à 100 000€ de C.A annuel": return 65000;
    case "100 000€ à 999 000€ de C.A annuel": return 200000; // libellé user : 100-300K
    case "300 000€ à 1 million € de C.A annuel": return 600000;
    case "1 million € à 10 millions € de C.A annuel": return 3000000;
    case "+ 10 millions € de C.A annuel": return 15000000;
    default: return null; // « Je n'ai pas encore d'entreprise » ou inconnu
  }
}

/** Par levier : impact annuel (fourchette, % du CA) + libellé du problème + douleur. */
export const LEVER_COST: Record<number, { low: number; high: number; probleme: string; douleur: string }> = {
  1: { low: 0.010, high: 0.025, probleme: "Piloter sans objectif chiffré clair",
       douleur: "Sans cap précis, vous corrigez trop tard et laissez filer des points de croissance chaque mois." },
  2: { low: 0.015, high: 0.030, probleme: "Une énergie dispersée sur trop de priorités",
       douleur: "À vouloir tout faire, on avance sur rien : l'éparpillement a un coût bien réel." },
  3: { low: 0.015, high: 0.030, probleme: "Un modèle et une offre pas assez solides",
       douleur: "Une offre tiède se vend mal et finit bradée : c'est de la marge qui s'évapore." },
  4: { low: 0.020, high: 0.040, probleme: "Subir la guerre des prix, faute de différenciation",
       douleur: "Sans avantage clair, vous justifiez vos prix au lieu de les imposer." },
  5: { low: 0.015, high: 0.030, probleme: "Du temps de dirigeant noyé dans l'opérationnel",
       douleur: "Chaque heure passée dans l'exécution est une heure volée à la croissance." },
  6: { low: 0.025, high: 0.045, probleme: "Des leviers de croissance laissés en jachère",
       douleur: "Le chiffre d'affaires que vous n'allez pas chercher, un concurrent le prend à votre place." },
  7: { low: 0.025, high: 0.045, probleme: "Des marges qui fuient et des prix trop bas",
       douleur: "Quelques points de marge perdus à chaque vente, ça finit par chiffrer très lourd." },
  8: { low: 0.015, high: 0.030, probleme: "Une équipe pas encore au niveau de vos ambitions",
       douleur: "Seul ou mal entouré, vous restez vous-même le plafond de votre entreprise." },
  9: { low: 0.015, high: 0.030, probleme: "Un second semestre sans plan d'exécution",
       douleur: "Un bon diagnostic sans plan, c'est une intention qui ne rapporte rien." },
};

export interface CostFigures {
  annualLow: number; annualHigh: number;
  fiveLow: number; fiveHigh: number;
}

/** Coût annuel + cumul 5 ans d'un levier, ou `null` si CA non chiffrable. */
export function leverCost(num: number, ca?: string): CostFigures | null {
  const rev = caToRevenue(ca);
  const imp = LEVER_COST[num];
  if (rev == null || !imp) return null;
  const annualLow = rev * imp.low;
  const annualHigh = rev * imp.high;
  return { annualLow, annualHigh, fiveLow: annualLow * 5, fiveHigh: annualHigh * 5 };
}

/** Cumul des 9 leviers (pour la C9). */
export function totalCost(ca?: string): CostFigures | null {
  const rev = caToRevenue(ca);
  if (rev == null) return null;
  let lo = 0, hi = 0;
  for (let n = 1; n <= TOTAL_CAPSULES; n++) {
    const imp = LEVER_COST[n];
    if (imp) { lo += rev * imp.low; hi += rev * imp.high; }
  }
  return { annualLow: lo, annualHigh: hi, fiveLow: lo * 5, fiveHigh: hi * 5 };
}

/** Arrondi « propre » (2 chiffres significatifs) pour un rendu d'estimation. */
function roundNice(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(roundNice(n));
}
