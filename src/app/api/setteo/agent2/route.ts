import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/setteo/agent2 — webhook ENTRANT depuis Setteo (Partie C).
 *
 * Appelé automatiquement quand le tag « agent 2 » est posé sur un lead. Retrouve le
 * lead et passe son champ `agent_2` à true (fige false→true, jamais l'inverse). À partir
 * de là, tous ses webhooks sortants partent vers les URLs du 2ᵉ numéro.
 *
 * - Auth : secret partagé (en-tête `X-Webhook-Secret` OU query `?secret=`).
 * - Payload : { first_name, email, phone, tag } — mêmes champs que le SaaS envoie déjà.
 * - Identifiant qui fait foi : email (clé du lead) ; repli sur le téléphone.
 * - Idempotent : deux appels identiques = un seul effet.
 * - Lead introuvable → 404 explicite (visible côté Setteo).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SETTEO_INBOUND_SECRET;
  // Fail-closed : sans secret configuré, l'endpoint n'accepte personne (jamais ouvert).
  if (!secret) return NextResponse.json({ error: "endpoint non configuré (SETTEO_INBOUND_SECRET manquant)" }, { status: 503 });
  const provided = req.headers.get("x-webhook-secret") || req.nextUrl.searchParams.get("secret") || "";
  if (provided !== secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { first_name?: string; prenom?: string; email?: string; phone?: string; tag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  if (!email && !phone) return NextResponse.json({ error: "email ou phone requis" }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Base non configurée" }, { status: 500 });

  const { data, error } = await supabase.rpc("set_agent_2", { p_email: email || null, p_phone: phone || null });
  if (error) {
    console.error("set_agent_2 error:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (data !== true) {
    // Lead absent chez nous → erreur explicite pour que Setteo la voie.
    return NextResponse.json({ error: "lead introuvable", email: email || null, phone: phone || null }, { status: 404 });
  }

  console.log(`Setteo agent2 : agent_2=true (tag="${body.tag ?? "-"}") pour ${email || phone}`);
  return NextResponse.json({ ok: true, agent_2: true });
}
