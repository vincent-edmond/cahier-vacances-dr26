import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/ab — enregistre une vue de LP par variante (A/B) pour le test d'acquisition.
 * Best-effort : n'impacte jamais l'affichage de la LP. Appelé une fois par session (AbView).
 */
export async function POST(req: NextRequest) {
  let body: { variant?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false });
  }
  const variant = body.variant === "A" || body.variant === "B" ? body.variant : null;
  if (!variant) return NextResponse.json({ ok: false });

  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc("ab_track_view", { p_variant: variant });
    if (error) console.error("ab_track_view error:", error.message);
  }
  return NextResponse.json({ ok: true });
}
