import { NextResponse, type NextRequest } from "next/server";
import { getCapsules, TOTAL_CAPSULES } from "@/lib/capsules";
import { buildPlanMessages, streamCompletion, completeOnce } from "@/lib/providers/anthropic";
import { getSupabase } from "@/lib/supabase";
import type { CapsuleProgress } from "@/lib/types";

/**
 * POST /api/plan
 * Compile le plan d'action du second semestre à partir de tout le cahier (C1→C9) et
 * le STREAME (token par token). Body : { sessionId?, progress, profil? }.
 * Réponse : flux `text/plain` (succès) ou JSON `{ plan }` (skip / repli / bloqué).
 */
function clientIp(req: NextRequest): string {
  return (req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim();
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: string; progress?: CapsuleProgress[]; profil?: { ca?: string; secteur?: string; activite?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  // Plafonné à 9 capsules (anti-gonflage du prompt depuis le client).
  const progress = (Array.isArray(body.progress) ? body.progress : []).slice(0, TOTAL_CAPSULES);
  const filled = progress.filter((p) => p.reponses && Object.keys(p.reponses).length > 0);
  if (filled.length === 0) {
    return NextResponse.json({ plan: null, filled: 0 });
  }

  // Anti-abus : même portillon que /api/exercice (opt-in + plafonds) avant l'appel IA.
  const supabase = getSupabase();
  if (supabase && body.sessionId) {
    const { data: verdict, error: gErr } = await supabase.rpc("ia_gate", {
      p_session: body.sessionId,
      p_ip: clientIp(req),
      p_session_limit: 25,
      p_ip_limit: 150,
      p_global_limit: Number(process.env.IA_DAILY_CAP || 8000),
    });
    if (gErr) console.error("ia_gate error:", gErr.message);
    if (typeof verdict === "string" && verdict !== "ok") {
      const message = verdict === "session"
        ? "Vous avez atteint la limite de retours pour aujourd'hui. Revenez demain."
        : "Le service est très sollicité en ce moment, réessayez dans quelques minutes.";
      return NextResponse.json({ plan: null, blocked: verdict, message });
    }
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
