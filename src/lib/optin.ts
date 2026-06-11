import type { LeadQuality } from "@/lib/types";

// ─── Valeurs EXACTES des propriétés HubSpot (= champs du formulaire) ─────────
// Portail 27215892 · form 991c1d4e-41a7-4acd-946e-a5de913ee71f (région eu1).

/** chiffre_d_affaires_annuel_new */
export const CA_OPTIONS = [
  "Je n'ai pas encore d'entreprise",
  "0 à 30 000€ de C.A annuel",
  "30 000€ à 100 000€ de C.A annuel",
  "100 000€ à 999 000€ de C.A annuel",
  "300 000€ à 1 million € de C.A annuel",
  "1 million € à 10 millions € de C.A annuel",
  "+ 10 millions € de C.A annuel",
] as const;

// Tranches ≥ 100K → lead quali (cible Summer Business : chefs d'entreprise établis).
// C'est sur ce segment qu'on optimise les campagnes.
const CA_QUALI = new Set<string>([
  "100 000€ à 999 000€ de C.A annuel",
  "300 000€ à 1 million € de C.A annuel",
  "1 million € à 10 millions € de C.A annuel",
  "+ 10 millions € de C.A annuel",
]);

export function caLeadQuality(ca: string): LeadQuality {
  return CA_QUALI.has(ca) ? "quali" : "classique";
}

/** secteur_dactivite_summer_business */
export const SECTEUR_OPTIONS = [
  "Saas",
  "Coach/Consultant/Thérapeute",
  "BTP",
  "Immo",
  "Dentiste",
  "Avocats",
  "Chirurgien",
  "Business en ligne",
  "Opticien",
  "CGP",
  "Expert-Comptable",
  "Autre",
] as const;

/** Noms internes des propriétés HubSpot ciblées par la soumission Forms API. */
export const HS_FIELD = {
  firstname: "firstname",
  email: "email",
  phone: "phone",
  ca: "chiffre_d_affaires_annuel_new",
  secteur: "secteur_dactivite_summer_business",
} as const;
