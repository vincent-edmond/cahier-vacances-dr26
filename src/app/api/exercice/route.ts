import { NextResponse, type NextRequest } from "next/server";
import { getCapsule } from "@/lib/capsules";
import { generateExerciceFeedback } from "@/lib/providers/anthropic";
import { leverCost } from "@/lib/cost";
import { getSupabase } from "@/lib/supabase";
import type { ExerciceReponses } from "@/lib/types";

/**
 * POST /api/exercice
 * Sauve les réponses d'un exercice et renvoie le feedback IA (Claude).
 * Body : { sessionId, capsuleNum, reponses, prenom? }
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

  // Fil rouge : récap des capsules DÉJÀ faites par cette session (lecture best-effort),
  // pour que Max IA garde le contexte d'une étape à l'autre. Dégrade proprement si vide.
  let prior: { capsuleNum: number; reponses: ExerciceReponses | null }[] = [];
  if (!skipFeedback && supabase) {
    const { data, error } = await supabase
      .from("progress")
      .select("capsule_num, reponses")
      .eq("session_id", sessionId);
    if (error) console.error("Supabase progress (fil rouge) error:", error.message);
    else if (Array.isArray(data)) {
      prior = (data as { capsule_num: number; reponses: ExerciceReponses | null }[])
        .map((r) => ({ capsuleNum: r.capsule_num, reponses: r.reponses ?? null }));
    }
  }

  // skipFeedback : on persiste seulement les réponses (cas C9 → synthèse via /api/plan).
  // Coût de l'inaction déterministe, data-driven : calé en priorité sur les chiffres
  // de l'exercice (objectif vs réalisé, clients × panier × fréquence), sinon le CA opt-in.
  const cout = skipFeedback ? null : leverCost(capsuleNum, profil?.ca, reponses);
  const feedbackIA = skipFeedback ? null : await generateExerciceFeedback(capsule, reponses, profil, cout, prior);

  // Persistance best-effort (no-op si Supabase non configuré)
  if (supabase) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("progress").upsert(
      {
        session_id: sessionId,
        capsule_num: capsuleNum,
        reponses,
        feedback_ia: feedbackIA,
        done_at: now,
        updated_at: now,
      },
      { onConflict: "session_id,capsule_num" }
    );
    if (error) console.error("Supabase progress upsert error:", error.message);

    // Persiste le contexte « activité » sur le participant (set-once, rattaché à la session).
    if (profil?.activite) {
      const { error: aErr } = await supabase.rpc("set_session_activite", {
        p_session_id: sessionId,
        p_activite: profil.activite.slice(0, 400),
      });
      if (aErr) console.error("set_session_activite error:", aErr.message);
    }
  }

  return NextResponse.json({ feedbackIA });
}
