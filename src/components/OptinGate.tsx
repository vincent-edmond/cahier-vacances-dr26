"use client";

import { useEffect, useState } from "react";
import { hasOptedIn } from "@/lib/session";
import { OptInModal } from "./OptInModal";

/**
 * Front gate de l'espace. Monté dans le layout `/espace` → couvre le hub ET les
 * capsules (y compris un lien direct partagé/bookmarké). À l'entrée, si le prospect
 * n'a pas encore créé son espace, l'opt-in est OBLIGATOIRE et débloque l'accès :
 * la conversion (`generate_lead`) part ainsi au plus tôt pour Meta/Google.
 *
 * Rien d'autre ne change : tous les branchements (HubSpot, Setteo/Camille, GTM,
 * anti-bidon, attribution, `lead_quality`) passent par `/api/optin` via la modale,
 * inchangés — seul le moment du déclenchement avance.
 */
export function OptinGate() {
  // null tant que le localStorage n'est pas lu (rendu serveur = rien, pas de mismatch).
  const [gated, setGated] = useState<boolean | null>(null);

  useEffect(() => {
    setGated(!hasOptedIn());
  }, []);

  if (!gated) return null; // accès déjà ouvert (ou état inconnu au 1er rendu)

  return (
    <OptInModal
      open
      mandatory
      onClose={() => {}}
      onComplete={() => setGated(false)}
    />
  );
}
