import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/visit — enregistre une visite du SaaS (entrée /espace).
 * Body : { sessionId, source? }. Comptage type Google Analytics via cdv.touch_session :
 *   • visiteur unique = 1 ligne par session navigateur (revenir n'en recrée pas),
 *   • visite          = +1 après 30 min d'inactivité.
 * Aucune PII ; écriture via fonction security-definer.
 */
export async function POST(req: NextRequest) {
  let body: { sessionId?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { sessionId, source } = body;
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, configured: false });

  const { error } = await supabase.rpc("touch_session", {
    p_session_id: sessionId,
    p_source: source ?? null,
  });
  if (error) console.error("Supabase touch_session error:", error.message);

  return NextResponse.json({ ok: !error, configured: true });
}
