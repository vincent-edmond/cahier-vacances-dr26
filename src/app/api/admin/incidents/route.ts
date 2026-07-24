import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/admin/incidents — bugs IA captés automatiquement + signalements des prospects.
 * Body : { password }. Même contrôle bcrypt côté Postgres que /api/admin/overview :
 * sans le bon mot de passe, rien ne sort.
 */
export async function POST(req: NextRequest) {
  let body: { password?: string; limit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Base non configurée" }, { status: 500 });

  const { data, error } = await supabase.rpc("admin_incidents", {
    p_pass: body.password ?? "",
    p_limit: typeof body.limit === "number" ? body.limit : 100,
  });
  if (error) {
    console.error("admin_incidents error:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (data && (data as { error?: string }).error === "unauthorized") {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  return NextResponse.json({ data });
}
