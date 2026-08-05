"use client";

import { useEffect, useState } from "react";
import { hasOptedIn, hasParticipant } from "@/lib/session";
import { OptInModal } from "./OptInModal";

/**
 * Front gate de l'espace. Monté dans le layout `/espace` → couvre le hub ET les
 * capsules (y compris un lien direct partagé/bookmarké). L'accès n'est débloqué que
 * par un opt-in COMPLET (prénom+email PUIS CA+secteur+tél) : la conversion
 * (`generate_lead`) part ainsi au plus tôt et le lead n'entre jamais incomplet.
 *
 * Trois cas à l'entrée :
 *  - opt-in complet          → aucun gate.
 *  - compte créé mais pas qualifié (ex. refresh après l'étape 1) → modale rouverte
 *    DIRECTEMENT à l'étape 2 (prénom/email pré-remplis), pas de re-saisie.
 *  - aucun compte            → modale à l'étape 1.
 *
 * Rien d'autre ne change : tous les branchements (HubSpot, Setteo/Camille, GTM,
 * anti-bidon, attribution, `lead_quality`) passent par `/api/optin` via la modale.
 */
export function OptinGate() {
  const [phase, setPhase] = useState<"loading" | "pass" | "gate1" | "gate2">("loading");

  useEffect(() => {
    if (hasOptedIn()) setPhase("pass");
    else if (hasParticipant()) setPhase("gate2"); // étape 1 faite, qualif à terminer
    else setPhase("gate1");
  }, []);

  if (phase === "loading" || phase === "pass") return null;

  return (
    <OptInModal
      open
      mandatory
      resume={phase === "gate2"}
      onClose={() => {}}
      onComplete={() => setPhase("pass")}
    />
  );
}
