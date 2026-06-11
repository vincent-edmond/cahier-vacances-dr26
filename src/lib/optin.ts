import type { CountryCode } from "libphonenumber-js";
import type { LeadQuality } from "@/lib/types";

// ─── Valeurs EXACTES des propriétés HubSpot (= champs du formulaire) ─────────
// Portail 27215892 · form 991c1d4e-41a7-4acd-946e-a5de913ee71f (région eu1).

/**
 * chiffre_d_affaires_annuel_new : `value` = valeur EXACTE envoyée à HubSpot,
 * `label` = ce que voit l'utilisateur (la tranche 100K a un libellé HubSpot
 * « 100 000€ à 300 000€ » alors que sa valeur stockée dit « …999 000€ »).
 */
export const CA_OPTIONS: { value: string; label: string }[] = [
  { value: "Je n'ai pas encore d'entreprise", label: "Je n'ai pas encore d'entreprise" },
  { value: "0 à 30 000€ de C.A annuel", label: "0 à 30 000€ de C.A annuel" },
  { value: "30 000€ à 100 000€ de C.A annuel", label: "30 000€ à 100 000€ de C.A annuel" },
  { value: "100 000€ à 999 000€ de C.A annuel", label: "100 000€ à 300 000€ de C.A annuel" },
  { value: "300 000€ à 1 million € de C.A annuel", label: "300 000€ à 1 million € de C.A annuel" },
  { value: "1 million € à 10 millions € de C.A annuel", label: "1 million € à 10 millions € de C.A annuel" },
  { value: "+ 10 millions € de C.A annuel", label: "+ 10 millions € de C.A annuel" },
];

/** Indicatifs téléphoniques proposés (France par défaut). `iso` pilote la validation. */
export const PHONE_COUNTRIES: { iso: CountryCode; flag: string; dial: string; name: string }[] = [
  { iso: "FR", flag: "🇫🇷", dial: "+33", name: "France" },
  { iso: "BE", flag: "🇧🇪", dial: "+32", name: "Belgique" },
  { iso: "CH", flag: "🇨🇭", dial: "+41", name: "Suisse" },
  { iso: "LU", flag: "🇱🇺", dial: "+352", name: "Luxembourg" },
  { iso: "MC", flag: "🇲🇨", dial: "+377", name: "Monaco" },
  { iso: "CA", flag: "🇨🇦", dial: "+1", name: "Canada" },
  { iso: "MA", flag: "🇲🇦", dial: "+212", name: "Maroc" },
  { iso: "DZ", flag: "🇩🇿", dial: "+213", name: "Algérie" },
  { iso: "TN", flag: "🇹🇳", dial: "+216", name: "Tunisie" },
  { iso: "GB", flag: "🇬🇧", dial: "+44", name: "Royaume-Uni" },
  { iso: "ES", flag: "🇪🇸", dial: "+34", name: "Espagne" },
  { iso: "IT", flag: "🇮🇹", dial: "+39", name: "Italie" },
  { iso: "DE", flag: "🇩🇪", dial: "+49", name: "Allemagne" },
  { iso: "PT", flag: "🇵🇹", dial: "+351", name: "Portugal" },
  { iso: "US", flag: "🇺🇸", dial: "+1", name: "États-Unis" },
];

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
