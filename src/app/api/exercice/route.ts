import { NextResponse, type NextRequest } from "next/server";
import { getCapsule } from "@/lib/capsules";
import { generateExerciceFeedback } from "@/lib/providers/anthropic";
import { getSupabase } from "@/lib/supabase";
import type { ExerciceReponses } from "@/lib/types";

/**
 * POST /api/exercice
 * Sauve les réponses d'un exercice et renvoie le feedback IA (Claude).
 * Body : { sessionId, capsuleNum, reponses, prenom? }
 */
export async function POST(req: NextRequest) {
  let body: { sessionId?: string; capsuleNum?: number; reponses?: ExerciceReponses; prenom?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { sessionId, capsuleNum, reponses } = body;
  if (!sessionId || typeof capsuleNum !== "number" || !reponses) {
    return NextResponse.json({ error: "sessionId, capsuleNum et reponses requis" }, { status: 400 });
  }

  const capsule = getCapsule(capsuleNum);
  if (!capsule) {
    return NextResponse.json({ error: "Capsule introuvable" }, { status: 404 });
  }

  const feedbackIA = await generateExerciceFeedback(capsule, reponses);

  // Persistance best-effort (no-op si Supabase non configuré)
  const supabase = getSupabase();
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
  }

  return NextResponse.json({ feedbackIA });
}
