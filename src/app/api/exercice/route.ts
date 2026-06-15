import { NextResponse, type NextRequest } from "next/server";
import { getCapsule } from "@/lib/capsules";
import { buildExerciceMessages, streamCompletion, completeOnce } from "@/lib/providers/anthropic";
import { leverCost } from "@/lib/cost";
import { getSupabase } from "@/lib/supabase";
import type { ExerciceReponses } from "@/lib/types";

/**
 * POST /api/exercice
 * Sauve les réponses, puis STREAME le retour de Max IA (token par token) pour une
 * attente perçue quasi nulle. Réponses persistées d'abord (robuste si l'IA échoue),
 * feedback persisté en fin de flux. Repli non streamé si le flux ne s'établit pas.
 * Réponse : flux `text/plain` (succès) ou JSON `{ feedbackIA }` (skip / repli).
 */
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

  // C9 (skipFeedback) : pas de retour par capsule, la synthèse passe par /api/plan.
  if (skipFeedback) return NextResponse.json({ feedbackIA: null });

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

  // Coût de l'inaction déterministe (calé sur ses chiffres, sinon la tranche de CA).
  const cout = leverCost(capsuleNum, profil?.ca, reponses);
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

  // Repli non streamé si le flux ne s'établit pas.
  const text = await completeOnce(messages);
  await persistFeedback(text ?? "");
  return NextResponse.json({ feedbackIA: text });
}
