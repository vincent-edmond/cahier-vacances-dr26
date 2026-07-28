import { NextResponse, type NextRequest } from "next/server";
import { getCapsule } from "@/lib/capsules";
import { buildExerciceMessages, streamCompletion, completeOnce } from "@/lib/providers/anthropic";
import { openaiComplete } from "@/lib/providers/openai";
import { leverCost } from "@/lib/cost";
import { getSupabase } from "@/lib/supabase";
import { logIncident } from "@/lib/incidents";
import { participantForSession, buildVariables, sendSetteo } from "@/lib/setteo";
import type { ExerciceReponses } from "@/lib/types";

/**
 * POST /api/exercice
 * Sauve les réponses, puis STREAME le retour de Max IA (token par token) pour une
 * attente perçue quasi nulle. Réponses persistées d'abord (robuste si l'IA échoue),
 * feedback persisté en fin de flux. Repli non streamé si le flux ne s'établit pas.
 * Réponse : flux `text/plain` (succès) ou JSON `{ feedbackIA }` (skip / repli / bloqué).
 */
function clientIp(req: NextRequest): string {
  return (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim();
}
function gateMessage(verdict: string): string {
  if (verdict === "no_optin") return "Créez votre espace pour recevoir votre retour de Max IA.";
  if (verdict === "session") return "Vous avez atteint la limite de retours pour aujourd'hui. Revenez demain.";
  return "Le service est très sollicité en ce moment, réessayez dans quelques minutes.";
}

export async function POST(req: NextRequest) {
  let body: {
    sessionId?: string;
    capsuleNum?: number;
    reponses?: ExerciceReponses;
    skipFeedback?: boolean;
    profil?: { ca?: string; secteur?: string; activite?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { sessionId, capsuleNum, reponses, skipFeedback, profil } = body;
  if (!sessionId || typeof capsuleNum !== "number" || !reponses) {
    return NextResponse.json({ error: "sessionId, capsuleNum et reponses requis" }, { status: 400 });
  }

  const capsule = getCapsule(capsuleNum);
  if (!capsule) {
    return NextResponse.json({ error: "Capsule introuvable" }, { status: 404 });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Persiste d'abord les RÉPONSES (sans attendre l'IA) : elles ne sont jamais perdues.
  if (supabase) {
    const { error } = await supabase.from("progress").upsert(
      { session_id: sessionId, capsule_num: capsuleNum, reponses, done_at: now, updated_at: now },
      { onConflict: "session_id,capsule_num" }
    );
    if (error) console.error("Supabase progress upsert error:", error.message);

    // Contexte « activité » sur le participant (set-once, rattaché à la session).
    if (profil?.activite) {
      const { error: aErr } = await supabase.rpc("set_session_activite", {
        p_session_id: sessionId,
        p_activite: profil.activite.slice(0, 400),
      });
      if (aErr) console.error("set_session_activite error:", aErr.message);
    }
  }

  // Webhook Setteo (Camille) : « capsule N terminée » = exercice soumis, c'est le
  // moment où la donnée existe. Placé AVANT le retour C9 pour couvrir aussi la C9.
  // Best-effort : n'échoue jamais côté prospect (~300 ms sur une génération de 20 s).
  if (supabase) {
    const participant = await participantForSession(sessionId);
    if (participant) {
      const { data: rows } = await supabase.from("progress").select("capsule_num, reponses").eq("session_id", sessionId);
      const progress = ((rows ?? []) as { capsule_num: number; reponses: ExerciceReponses | null }[])
        .map((r) => ({ capsuleNum: r.capsule_num, reponses: r.reponses }));
      await sendSetteo(`c${capsuleNum}`, participant, buildVariables(participant, progress), sessionId);
    }
  }

  // C9 (skipFeedback) : pas de retour par capsule, la synthèse passe par /api/plan.
  if (skipFeedback) return NextResponse.json({ feedbackIA: null });

  // Anti-abus : opt-in obligatoire (vérif SERVEUR) + plafonds (session / IP / global)
  // avant tout appel IA payant. Best-effort : si Supabase indisponible, on n'aveugle pas.
  if (supabase) {
    const { data: verdict, error: gErr } = await supabase.rpc("ia_gate", {
      p_session: sessionId,
      p_ip: clientIp(req),
      p_session_limit: 25,
      p_ip_limit: 150,
      p_global_limit: Number(process.env.IA_DAILY_CAP || 8000),
    });
    if (gErr) console.error("ia_gate error:", gErr.message);
    if (typeof verdict === "string" && verdict !== "ok") {
      return NextResponse.json({ feedbackIA: null, blocked: verdict, message: gateMessage(verdict) });
    }
  }

  // Fil rouge : récap des capsules déjà faites (lecture best-effort) → contexte continu.
  let prior: { capsuleNum: number; reponses: ExerciceReponses | null }[] = [];
  if (supabase) {
    const { data, error } = await supabase.from("progress").select("capsule_num, reponses").eq("session_id", sessionId);
    if (error) console.error("Supabase progress (fil rouge) error:", error.message);
    else if (Array.isArray(data)) {
      prior = (data as { capsule_num: number; reponses: ExerciceReponses | null }[])
        .map((r) => ({ capsuleNum: r.capsule_num, reponses: r.reponses ?? null }));
    }
  }

  // Coût de l'inaction déterministe, sur le CA CANONIQUE (cohérent entre capsules :
  // on passe l'historique pour retrouver le vrai CA quel que soit le levier en cours).
  const cout = leverCost(capsuleNum, profil?.ca, reponses, prior);
  const messages = buildExerciceMessages(capsule, reponses, profil, cout, prior);

  // Persiste le feedback en fin de génération (best-effort, n'écrase que feedback_ia).
  const persistFeedback = async (full: string) => {
    if (supabase && full) {
      const { error } = await supabase.from("progress").upsert(
        { session_id: sessionId, capsule_num: capsuleNum, feedback_ia: full, updated_at: new Date().toISOString() },
        { onConflict: "session_id,capsule_num" }
      );
      if (error) console.error("Supabase feedback upsert error:", error.message);
    }
  };

  // Streaming (chemin nominal).
  const stream = await streamCompletion(messages, persistFeedback);
  if (stream) {
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Repli non streamé Anthropic si le flux ne s'établit pas.
  let text = await completeOnce(messages);
  let viaBackup = false;

  // BACKUP : Anthropic totalement KO → bascule OpenAI (même prompt, « quasi-Max »).
  if (!text) {
    text = await openaiComplete(messages);
    viaBackup = !!text;
  }

  await persistFeedback(text ?? "");

  if (viaBackup) {
    // Anthropic est tombé mais le prospect a bien eu son retour : on le trace pour
    // savoir QUAND et à quelle fréquence Anthropic flanche.
    await logIncident({
      kind: "ia_failure",
      sessionId,
      capsuleNum,
      message: "Anthropic indisponible : retour généré par le backup OpenAI.",
      context: { endpoint: "/api/exercice", fallback: "openai" },
    });
  } else if (!text) {
    // Les deux fournisseurs ont échoué : remonté sans attendre un signalement.
    await logIncident({
      kind: "ia_failure",
      sessionId,
      capsuleNum,
      context: { endpoint: "/api/exercice", reason: "anthropic + openai en échec" },
    });
  }
  return NextResponse.json({ feedbackIA: text });
}
