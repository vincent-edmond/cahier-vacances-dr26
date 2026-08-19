import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/dr-click — enregistre un clic « intérêt Destination Réussite ».
 * Body : { sessionId, source: "cta" | "popup", capsule? }.
 *   • source "cta"   = clic sur un CTA DR en bas de capsule,
 *   • source "popup" = clic sur le bouton du popup de relance DR.
 * Signal d'intention le plus fort du parcours. Écriture via fonction security-definer.
 * Best-effort : ne bloque jamais la navigation (le client envoie en keepalive).
 */
export async function POST(req: NextRequest) {
  let body: { sessionId?: string; source?: string; capsule?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const { sessionId, source } = body;
  if (!sessionId || (source !== "cta" && source !== "popup")) {
    return NextResponse.json({ error: "sessionId et source (cta|popup) requis" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, configured: false });

  const { error } = await supabase.rpc("log_dr_click", {
    p_session: sessionId,
    p_source: source,
    p_capsule: typeof body.capsule === "number" ? body.capsule : null,
  });
  if (error) console.error("Supabase log_dr_click error:", error.message);

  return NextResponse.json({ ok: !error, configured: true });
}
