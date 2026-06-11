import { NextResponse, type NextRequest } from "next/server";
import { getCapsules } from "@/lib/capsules";
import { generatePlanFinal } from "@/lib/providers/anthropic";
import type { CapsuleProgress } from "@/lib/types";

/**
 * POST /api/plan
 * Compile le plan d'action H2 à partir de tout le cahier (réponses C1→C9).
 * Body : { progress: CapsuleProgress[] }  (envoyé par le client, qui fusionne
 * déjà serveur + localStorage).
 */
export async function POST(req: NextRequest) {
  let body: { progress?: CapsuleProgress[]; profil?: { ca?: string; secteur?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const progress = Array.isArray(body.progress) ? body.progress : [];
  const filled = progress.filter((p) => p.reponses && Object.keys(p.reponses).length > 0);

  if (filled.length === 0) {
    return NextResponse.json({ plan: null, filled: 0 });
  }

  const plan = await generatePlanFinal(getCapsules(), filled, body.profil);
  return NextResponse.json({ plan, filled: filled.length });
}
