import { getSupabase } from "@/lib/supabase";
import { logIncident } from "@/lib/incidents";
import type { ExerciceReponses } from "@/lib/types";

/**
 * Webhooks Setteo (agent WhatsApp « Camille », côté Smart Funnel).
 *
 * Format imposé par Setteo : POST JSON, contact identifié par le téléphone au
 * format international SANS le « + ». On y ajoute `variables` (profil + réponses)
 * pour permettre la segmentation côté Camille.
 *
 * Règle métier : on n'envoie JAMAIS un lead sans entreprise (il ne doit pas
 * converser avec Camille), ni un lead sans téléphone (Setteo ne saurait pas
 * l'identifier). Même exclusion que la relance DR sur le site.
 *
 * Configuration : UNE variable d'env `SETTEO_WEBHOOKS` contenant le JSON des URLs
 * (une seule valeur à coller côté Netlify plutôt que onze) :
 *   {"optin":"https://…","c1":"https://…", …, "c9":"https://…","plan":"https://…"}
 */
const SANS_ENTREPRISE = "Je n'ai pas encore d'entreprise";
// Réponses envoyées EN ENTIER (Setteo en fait un résumé remonté dans HubSpot).
// Seule garde : une borne très haute (anti-abus), qu'aucune réponse réelle n'atteint,
// pour qu'un copier-coller massif malveillant ne casse pas le webhook.
const SAFETY_LEN = 8000;

export type SetteoEvent = "optin" | "plan" | `c${number}`;

function urls(): Record<string, string> {
  const raw = process.env.SETTEO_WEBHOOKS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.error("SETTEO_WEBHOOKS: JSON invalide");
    return {};
  }
}

export interface SetteoParticipant {
  prenom: string | null;
  email: string | null;
  phone: string | null;
  ca: string | null;
  secteur: string | null;
  lead_quality: string | null;
  activite: string | null;
  /** L'opt-in a-t-il déjà été envoyé avec succès à Setteo ? (contact créé) */
  setteo_optin_ok?: boolean;
}

/** Lit le participant rattaché à une session (null s'il n'a pas encore fait l'opt-in). */
export async function participantForSession(sessionId: string): Promise<SetteoParticipant | null> {
  const supabase = getSupabase();
  if (!supabase || !sessionId) return null;
  const { data, error } = await supabase.rpc("participant_for_webhook", { p_session: sessionId });
  if (error) {
    console.error("participant_for_webhook error:", error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as SetteoParticipant) ?? null;
}

/** Téléphone E.164 (+33…) → format Setteo (33…, sans le +). */
function phoneSetteo(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}

/**
 * Construit `variables` : profil + réponses de TOUTES les capsules déjà faites,
 * avec des clés EXPLICITES (`c1_objectif_ca`) plutôt que `reponse_1`, pour que la
 * donnée reste lisible et ne casse pas si un champ change.
 */
export function buildVariables(
  p: SetteoParticipant,
  progress: { capsuleNum: number; reponses: ExerciceReponses | null }[],
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (p.ca) out.ca_bracket = p.ca;
  if (p.secteur) out.secteur = p.secteur;
  if (p.lead_quality) out.lead_quality = p.lead_quality;
  if (p.activite) out.activite = p.activite.slice(0, SAFETY_LEN);
  out.capsules_completees = progress.filter((r) => r.reponses && Object.keys(r.reponses).length > 0).length;

  for (const row of progress) {
    if (!row.reponses) continue;
    for (const [champ, valeur] of Object.entries(row.reponses)) {
      if (valeur === null || valeur === undefined || `${valeur}`.trim() === "") continue;
      out[`c${row.capsuleNum}_${champ}`] = `${valeur}`.slice(0, SAFETY_LEN);
    }
  }
  return out;
}

/**
 * Envoie un événement à Setteo. Best-effort et silencieux pour le prospect :
 * un webhook qui échoue ne doit jamais casser son parcours. Un échec définitif
 * est tracé dans /admin (sinon il serait invisible).
 */
export async function sendSetteo(
  event: SetteoEvent,
  p: SetteoParticipant,
  variables: Record<string, string | number>,
  sessionId?: string,
): Promise<boolean> {
  const url = urls()[event];
  if (!url) return false;                             // événement non configuré
  if (p.ca === SANS_ENTREPRISE) return false;         // hors cible : pas de Camille
  const phone = phoneSetteo(p.phone);
  if (!phone) return false;                           // Setteo ne pourrait pas l'identifier

  const body = JSON.stringify({
    first_name: p.prenom ?? "",
    last_name: "",                                    // non collecté à l'opt-in
    email: p.email ?? "",
    phone,
    variables,
  });

  for (let essai = 0; essai < 2; essai++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return true;
      console.error(`Setteo ${event} error:`, res.status, (await res.text()).slice(0, 200));
    } catch (e) {
      console.error(`Setteo ${event} failed:`, (e as Error).message);
    }
    if (essai === 0) await new Promise((r) => setTimeout(r, 600));
  }

  await logIncident({
    kind: "ia_failure",
    sessionId: sessionId ?? null,
    email: p.email,
    message: `Webhook Setteo « ${event} » en échec après réessai.`,
    context: { endpoint: "setteo", event },
  });
  return false;
}

/** Mémorise que l'opt-in Setteo a bien été envoyé (contact créé) → on ne le renverra plus. */
export async function markOptinSent(email: string | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !email) return;
  const { error } = await supabase.rpc("set_setteo_optin_ok", { p_email: email });
  if (error) console.error("set_setteo_optin_ok error:", error.message);
}

/**
 * Envoie un tag capsule / plan en GARANTISSANT d'abord que le contact existe dans
 * Setteo (exigence Mathis : un tag seul ne crée pas le contact). Si l'opt-in n'a pas
 * encore réussi (1er webhook tombé), on le renvoie AVANT le tag, puis on le mémorise.
 * Aucun re-spam : dès que l'opt-in a réussi une fois, on ne le renvoie plus.
 */
export async function sendTagWithOptin(
  event: SetteoEvent,
  p: SetteoParticipant,
  variables: Record<string, string | number>,
  sessionId?: string,
): Promise<void> {
  if (!p.setteo_optin_ok) {
    const ok = await sendSetteo("optin", p, variables, sessionId);
    if (ok) await markOptinSent(p.email);
  }
  await sendSetteo(event, p, variables, sessionId);
}
