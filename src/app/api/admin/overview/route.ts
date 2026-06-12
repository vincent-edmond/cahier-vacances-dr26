import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/admin/overview — KPIs du back-office.
 * Body : { password }. Le mot de passe est vérifié (bcrypt) côté Postgres par la
 * fonction security-definer cdv.admin_overview ; sans le bon mot de passe, rien ne sort.
 */
export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Base non configurée" }, { status: 500 });

  const { data, error } = await supabase.rpc("admin_overview", { p_pass: body.password ?? "" });
  if (error) {
    console.error("admin_overview error:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (data && (data as { error?: string }).error === "unauthorized") {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }
  return NextResponse.json({ data });
}
