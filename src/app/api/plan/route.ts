import { NextResponse, type NextRequest } from "next/server";
import { getCapsules } from "@/lib/capsules";
import { buildPlanMessages, streamCompletion, completeOnce } from "@/lib/providers/anthropic";
import type { CapsuleProgress } from "@/lib/types";

/**
 * POST /api/plan
 * Compile le plan d'action du second semestre à partir de tout le cahier (C1→C9) et
 * le STREAME (token par token). Body : { progress, profil? } (le client fusionne déjà
 * serveur + localStorage). Réponse : flux `text/plain` (succès) ou JSON `{ plan }`.
 */
export async function POST(req: NextRequest) {
  let body: { progress?: CapsuleProgress[]; profil?: { ca?: string; secteur?: string; activite?: string } };
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

  const messages = buildPlanMessages(getCapsules(), filled, body.profil);
  if (!messages) return NextResponse.json({ plan: null, filled: 0 });

  const stream = await streamCompletion(messages);
  if (stream) {
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const plan = await completeOnce(messages);
  return NextResponse.json({ plan, filled: filled.length });
}
