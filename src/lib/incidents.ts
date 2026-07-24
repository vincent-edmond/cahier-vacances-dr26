import { getSupabase } from "@/lib/supabase";

/**
 * Incidents = ce qui doit remonter à l'équipe :
 *  • `ia_failure`  : échec de génération Max IA, capté AUTOMATIQUEMENT (l'utilisateur
 *                    ne signale presque jamais, il part). Visible dans /admin.
 *  • `user_report` : signalement volontaire via « Besoin d'aide ? ». Notifié dans Slack
 *                    (ça demande une action humaine) ET stocké pour l'historique.
 * Tout est best-effort : un incident ne doit JAMAIS casser le parcours du prospect.
 */
export interface IncidentInput {
  kind: "ia_failure" | "user_report";
  sessionId?: string | null;
  capsuleNum?: number | null;
  prenom?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  /** Contexte technique auto-attaché : endpoint, erreur, url, navigateur. */
  context?: Record<string, unknown> | null;
}

export async function logIncident(i: IncidentInput): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.rpc("log_incident", {
    p_kind: i.kind,
    p_session: i.sessionId ?? null,
    p_capsule: i.capsuleNum ?? null,
    p_prenom: i.prenom ?? null,
    p_email: i.email ?? null,
    p_phone: i.phone ?? null,
    p_message: i.message ?? null,
    p_context: i.context ?? null,
  });
  if (error) console.error("log_incident error:", error.message);
}

// Webhook entrant Slack (canal support). Non configuré = pas de notification,
// mais l'incident reste enregistré en base : on ne perd jamais l'information.
const SLACK_URL = process.env.SLACK_HELP_WEBHOOK_URL;

export async function notifySlack(text: string): Promise<void> {
  if (!SLACK_URL) return;
  try {
    const res = await fetch(SLACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("Slack notify error:", res.status, (await res.text()).slice(0, 200));
  } catch (e) {
    console.error("Slack notify failed:", (e as Error).message);
  }
}
