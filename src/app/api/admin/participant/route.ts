import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/** POST /api/admin/participant — fiche détaillée d'un prospect. Body : { password, email }. */
export async function POST(req: NextRequest) {
  let body: { password?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
  if (!body.email) return NextResponse.json({ error: "email requis" }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Base non configurée" }, { status: 500 });

  const { data, error } = await supabase.rpc("admin_participant_detail", {
    p_pass: body.password ?? "",
    p_email: body.email,
  });
  if (error) {
    console.error("admin_participant_detail error:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  const d = data as { error?: string };
  if (d?.error === "unauthorized") return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (d?.error === "not_found") return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ data });
}
