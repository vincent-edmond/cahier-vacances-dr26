// ─── Coût de l'inaction (« taxe stupide ») ──────────────────────────────────
// Estimation du manque à gagner ANNUEL, data-driven et défendable — pas un %
// au hasard. Par ordre de priorité, on s'appuie sur :
//   1) les chiffres réels de l'exercice (objectif vs réalisé en C1, clients ×
//      panier × fréquence en C6) → la donnée la plus crédible (ses propres chiffres),
//   2) à défaut, la tranche de CA déclarée à l'opt-in × un impact de référence.
//
// Référentiel des impacts (sources) :
//   • Pricing / offre / différenciation : McKinsey « Power of Pricing » — +1 % de
//     prix ≈ +8 % de résultat opérationnel ; un sous-pricing/offre faible coûte donc
//     plusieurs points de CA en marge et conversions perdues. → 8-18 % du CA.
//   • Croissance : +10 % sur chacun des 3 leviers (clients × panier × fréquence)
//     ≈ +33 % de CA (loi multiplicative). On retient une fraction capturable. → 10-25 %.
//   • Rentabilité / cash : marges qui fuient, BFR mal piloté. → 6-15 %.
//   • Équipe : un mauvais recrutement coûte ≥ 30 % du salaire annuel (US DoL) ; un
//     poste-clé non pourvu = manque à gagner. → 5-13 %.
//   • Pilotage / focus / opérationnel : croissance non captée, temps dirigeant perdu. → 5-14 %.

import type { ExerciceReponses } from "@/lib/types";

/** CA représentatif (€/an) d'une tranche d'opt-in (fallback). */
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

/**
 * Impact de référence par levier (fourchette, % du CA). UNIQUEMENT les leviers dont
 * la perte se chiffre de façon défendable — croisé avec les ordres de grandeur que
 * Max donne lui-même dans ses formations :
 *   • C1 bilan   → écart à l'objectif (ses propres chiffres).
 *   • C3 offre   → Max : « on peut doubler ses ventes » ; prix 3-5× (McKinsey pricing). 8-18 % = conservateur.
 *   • C4 diff.   → Dyson facture « 3-5× plus cher » ; sinon guerre des prix. 8-18 %.
 *   • C6 crois.  → Max : « +10 % sur chacun des 3 leviers = +33 % de CA ». 10-25 % ⊂ son +33 %.
 *   • C7 cash    → Max : Rebecca's Coffee « +5 % de prix = +258 K » ; 7 leviers « -243 K → +1 M ». 6-15 %.
 * Les leviers C2 (focus), C5 (productivité), C8 (recrutement) ne sont PAS ici : chez Max,
 * leurs chiffres sont des gains personnels (×5, ×15-20, 1 jour/semaine) non transposables en
 * € de perte pour un prospect → on ne chiffre pas, on formule autrement (cf. le prompt feedback).
 */
const LEVER_PCT: Record<number, { low: number; high: number }> = {
  1: { low: 0.05, high: 0.10 },
  3: { low: 0.08, high: 0.15 },
  4: { low: 0.08, high: 0.15 },
  6: { low: 0.10, high: 0.18 },
  7: { low: 0.06, high: 0.12 },
};

/** Copie éditoriale de la carte « coût de l'inaction » (indépendante du calcul). */
export const LEVER_COPY: Record<number, { probleme: string; douleur: string }> = {
  1: { probleme: "Vous pilotez à l'instinct, sans cap chiffré.", douleur: "Chaque mois sans tableau de bord, ce sont des décisions prises trop tard." },
  2: { probleme: "Votre énergie est éparpillée sur trop de fronts.", douleur: "Tant que tout est prioritaire, rien n'avance vraiment." },
  3: { probleme: "Votre offre ne déclenche pas le « oui » immédiat.", douleur: "Une offre molle, ce sont des prospects qui comparent, hésitent et négocient." },
  4: { probleme: "Vous ressemblez trop à vos concurrents.", douleur: "Sans différence nette, le combat se joue sur le prix, et c'est vous qui payez." },
  5: { probleme: "Vous faites encore trop de choses vous-même.", douleur: "Votre temps de dirigeant part dans des tâches qui ne valent pas votre niveau." },
  6: { probleme: "Vous laissez de la croissance sur la table.", douleur: "Chaque levier sous-exploité, c'est du chiffre d'affaires qui dort." },
  7: { probleme: "Vous travaillez beaucoup pour une marge qui fond.", douleur: "Du chiffre sans rentabilité, c'est de la fatigue sans récompense." },
  8: { probleme: "Votre équipe n'est pas encore à la hauteur de vos ambitions.", douleur: "Un poste-clé mal tenu freine toute l'entreprise." },
};

export interface CostFigures {
  annualLow: number; annualHigh: number;
  fiveLow: number; fiveHigh: number;
  /** Base de calcul (pour que Max IA explique le chiffre de façon crédible). */
  note: string;
  /** Présent si les chiffres du prospect se contredisent (à signaler, sans jugement). */
  discrepancy?: string;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(`${v}`.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Arrondi à un chiffre « rond » lisible (jamais de 9 800 € : on aura 10 000 €). */
function roundClean(n: number): number {
  if (n <= 0) return 0;
  const step = n < 20000 ? 1000 : n < 100000 ? 5000 : n < 500000 ? 10000 : 50000;
  return Math.max(step, Math.round(n / step) * step);
}

function figures(low: number, high: number, note: string): CostFigures {
  const aLow = roundClean(low), aHigh = roundClean(high);
  return { annualLow: aLow, annualHigh: aHigh, fiveLow: roundClean(aLow * 5), fiveHigh: roundClean(aHigh * 5), note };
}

export interface PriorAnswers {
  capsuleNum: number;
  reponses: ExerciceReponses | null;
}

/**
 * CA annuel CANONIQUE du prospect : UNE seule base, utilisée par TOUTES les capsules
 * pour que les montants soient cohérents d'une étape à l'autre. Priorité au chiffre le
 * plus réel et le plus précis :
 *   1) CA reconstitué (clients × panier × fréquence, C6) — le plus granulaire,
 *   2) CA réalisé annualisé (réalisé mi-année × 2, C1),
 *   3) objectif de CA (C1),
 *   4) à défaut seulement, la tranche d'opt-in (chiffre du barème).
 */
function canonicalRevenue(ca: string | undefined, m: ExerciceReponses): { rev: number; note: string } | null {
  const clients = num(m.nb_clients), panier = num(m.panier_moyen), freq = num(m.frequence);
  if (clients && panier && freq) {
    const rev = clients * panier * freq;
    return { rev, note: `votre CA reconstitué (${clients} clients × ${formatEuro(panier)} × ${freq}/an ≈ ${formatEuro(rev)})` };
  }
  const realise = num(m.ca_realise);
  if (realise) return { rev: realise * 2, note: `votre CA annualisé (~${formatEuro(realise * 2)}, d'après le réalisé à mi-année)` };
  const objectif = num(m.objectif_ca);
  if (objectif) return { rev: objectif, note: `votre objectif de CA (~${formatEuro(objectif)})` };
  const rev = caToRevenue(ca);
  if (rev != null) return { rev, note: `votre tranche de CA déclarée (~${formatEuro(rev)})` };
  return null;
}

/**
 * Coût annuel + cumul 5 ans d'un levier, sur la base du CA CANONIQUE (cohérent entre
 * toutes les capsules). `prior` = réponses des capsules déjà faites (pour retrouver le
 * CA réel quel que soit le levier en cours). `null` si rien d'exploitable (→ qualitatif).
 */
export function leverCost(num_: number, ca?: string, reponses?: ExerciceReponses, prior?: PriorAnswers[]): CostFigures | null {
  const pct = LEVER_PCT[num_];
  if (!pct) return null; // levier qualitatif (C2/C5/C8) → pas de montant

  // Vue fusionnée de toutes les réponses connues (étapes précédentes + courante).
  const merged: ExerciceReponses = {};
  for (const p of prior ?? []) if (p.reponses) Object.assign(merged, p.reponses);
  if (reponses) Object.assign(merged, reponses);

  const canon = canonicalRevenue(ca, merged);

  // C1 — la taxe = une fraction de l'ÉCART à l'objectif, jamais plus que l'écart lui-même.
  if (num_ === 1) {
    const objectif = num(merged.objectif_ca);
    const realise = num(merged.ca_realise);
    if (objectif && realise != null) {
      const trajectoire = realise * 2;
      const ecart = Math.max(0, objectif - trajectoire);
      if (ecart > 0) {
        return figures(ecart * 0.25, ecart * 0.5, `l'écart entre votre objectif (${formatEuro(objectif)}) et votre trajectoire actuelle (~${formatEuro(trajectoire)}, d'après le réalisé à mi-année)`);
      }
      // Objectif déjà tenu → coût modéré d'un pilotage encore perfectible.
      if (canon) return figures(canon.rev * 0.04, canon.rev * 0.08, `un pilotage encore perfectible, sur la base de ${canon.note}`);
    }
  }

  if (!canon) return null;
  const fig = figures(canon.rev * pct.low, canon.rev * pct.high, canon.note);

  // Capsule 6 : si les chiffres du prospect se contredisent (réalisé annualisé d'un côté,
  // volumes clients × panier × fréquence de l'autre, écart > 15 %), on le signale pour que
  // Max IA le relève de façon NEUTRE et précise sur quel chiffre il base son analyse.
  if (num_ === 6) {
    const realise = num(merged.ca_realise);
    const annualized = realise ? realise * 2 : num(merged.objectif_ca);
    const reconstituted = canon.rev;
    if (annualized && reconstituted && Math.abs(annualized - reconstituted) / Math.max(annualized, reconstituted) > 0.15) {
      fig.discrepancy = `Ses chiffres ne concordent pas : son réalisé annualisé indique ~${formatEuro(annualized)}, mais ses volumes clients (clients × panier × fréquence) indiquent ~${formatEuro(reconstituted)}. L'analyse se base sur le CA reconstitué.`;
    }
  }
  return fig;
}

/** Cumul des 9 leviers (C9) : agrégat réaliste 20-40 % du CA (les leviers se recoupent).
 * Utilise le CA canonique (même base que les taxes par capsule) quand on a les réponses. */
export function totalCost(ca?: string, merged?: ExerciceReponses): CostFigures | null {
  const canon = merged ? canonicalRevenue(ca, merged) : null;
  const rev = canon?.rev ?? caToRevenue(ca);
  if (rev == null) return null;
  const base = canon ? canon.note : `un CA d'environ ${formatEuro(rev)}`;
  return figures(rev * 0.20, rev * 0.40, `potentiel non capté sur l'ensemble des 9 leviers, sur la base de ${base}`);
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n);
}
