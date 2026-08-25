import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * OUTIL INTERNE ISOLÉ — relecture/validation des questions du diagnostic.
 * Aucun lien avec le SaaS : table dédiée cdv.audit_review, fonctions dédiées.
 *
 * GET  /api/audit-review?id=questions   → { data: <état sauvegardé | null> }
 * POST /api/audit-review  { id, data }  → enregistre l'état complet (upsert).
 * Pas d'authentification : l'accès se fait par une URL non liée (choix produit).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "questions";
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ data: null, configured: false });

  const { data, error } = await supabase.rpc("audit_review_get", { p_id: id });
  if (error) {
    console.error("audit_review_get error:", error.message);
    return NextResponse.json({ data: null, error: "server" }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? null, configured: true });
}

export async function POST(req: NextRequest) {
  let body: { id?: string; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
  const id = body.id || "questions";
  if (body.data == null) return NextResponse.json({ error: "data requis" }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true, configured: false });

  const { error } = await supabase.rpc("audit_review_save", { p_id: id, p_data: body.data });
  if (error) {
    console.error("audit_review_save error:", error.message);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
