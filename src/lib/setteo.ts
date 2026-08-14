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
 * Configuration : UNE variable d'env par événement (format .env natif, pas de JSON) :
 *   SETTEO_URL_OPTIN, SETTEO_URL_C1 … SETTEO_URL_C9, SETTEO_URL_PLAN
 * (Repli sur l'ancien SETTEO_WEBHOOKS au format JSON s'il est présent.)
 */
const SANS_ENTREPRISE = "Je n'ai pas encore d'entreprise";
// Réponses envoyées EN ENTIER (Setteo en fait un résumé remonté dans HubSpot).
// Seule garde : une borne très haute (anti-abus), qu'aucune réponse réelle n'atteint,
// pour qu'un copier-coller massif malveillant ne casse pas le webhook.
const SAFETY_LEN = 8000;

export type SetteoEvent = "optin" | "plan" | `c${number}`;

function urls(): Record<string, string> {
  const e = process.env;
  const map: Record<string, string> = {};
  const add = (k: string, v?: string) => { const s = (v || "").trim(); if (s) map[k] = s; };
  // Format .env natif : une variable par événement (facile à importer dans Netlify).
  add("optin", e.SETTEO_URL_OPTIN);
  add("plan", e.SETTEO_URL_PLAN);
  for (let i = 1; i <= 9; i++) add(`c${i}`, e[`SETTEO_URL_C${i}`]);
  if (Object.keys(map).length) return map;

  // Repli : ancien format JSON monobloc dans SETTEO_WEBHOOKS.
  const raw = e.SETTEO_WEBHOOKS;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.error("SETTEO_WEBHOOKS: JSON invalide");
    return {};
  }
}

/**
 * URLs du 2ᵉ numéro (agent 2). Même structure : une variable par événement
 * (SETTEO_URL_AGENT2_OPTIN, _C1…_C9, _PLAN). Utilisées UNIQUEMENT pour un lead
 * agent_2=true, à la place des URLs actuelles (jamais en plus).
 */
function urlsAgent2(): Record<string, string> {
  const e = process.env;
  const map: Record<string, string> = {};
  const add = (k: string, v?: string) => { const s = (v || "").trim(); if (s) map[k] = s; };
  add("optin", e.SETTEO_URL_AGENT2_OPTIN);
  add("plan", e.SETTEO_URL_AGENT2_PLAN);
  for (let i = 1; i <= 9; i++) add(`c${i}`, e[`SETTEO_URL_AGENT2_C${i}`]);
  return map;
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
  /** Basculé sur le 2ᵉ numéro WhatsApp (agent 2) ? Fige false→true, jamais recalculé.
   *  Absent/undefined = false. Route le webhook vers les URLs agent_2 au lieu des URLs actuelles. */
  agent_2?: boolean;
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
  // Partie B — routage : lead agent_2=true → URLs du 2ᵉ numéro UNIQUEMENT (jamais l'URL
  // actuelle). Si l'URL agent_2 de cet événement manque, on N'ENVOIE PAS (ne jamais
  // retomber sur le 1er numéro, sinon le lead partirait sur les deux). Incident tracé.
  const agent2 = p.agent_2 === true;
  const url = (agent2 ? urlsAgent2() : urls())[event];
  if (!url) {
    if (agent2) {
      await logIncident({
        kind: "ia_failure", sessionId: sessionId ?? null, email: p.email,
        message: `Setteo agent 2 : URL manquante pour « ${event} » → webhook NON envoyé (sécurité).`,
        context: { endpoint: "setteo", event, agent_2: true },
      });
    }
    return false;                                     // événement non configuré
  }
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
