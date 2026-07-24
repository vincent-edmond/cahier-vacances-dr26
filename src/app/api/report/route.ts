import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { logIncident, notifySlack } from "@/lib/incidents";
import { validateEmailFormat } from "@/lib/validation";

/**
 * POST /api/report — signalement depuis « Besoin d'aide ? ».
 * Body : { sessionId?, capsuleNum?, prenom?, email, phone?, message, context? }
 * Enregistre l'incident en base (historique dans /admin) puis notifie Slack
 * (canal support) : c'est le seul événement qui demande une action humaine.
 * Endpoint public → plafonné à 5 signalements / heure / IP.
 */
function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    (req.headers.get("x-forwarded-for") || "").split(",")[0] ||
    ""
  ).trim();
}

export async function POST(req: NextRequest) {
  let body: {
    sessionId?: string;
    capsuleNum?: number;
    prenom?: string;
    email?: string;
    phone?: string;
    message?: string;
    context?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const message = (body.message ?? "").trim();

  if (!message) return NextResponse.json({ error: "Décrivez le problème rencontré." }, { status: 400 });
  const fmt = validateEmailFormat(email);
  if (!fmt.ok) return NextResponse.json({ error: fmt.reason }, { status: 400 });

  // Anti-spam (best-effort : si Supabase est indisponible on ne bloque pas le signalement).
  const supabase = getSupabase();
  if (supabase) {
    const { data: allowed, error } = await supabase.rpc("report_gate", { p_ip: clientIp(req), p_limit: 5, p_window: 3600 });
    if (error) console.error("report_gate error:", error.message);
    if (allowed === false) {
      return NextResponse.json(
        { error: "Trop de signalements envoyés. Réessayez dans une heure." },
        { status: 429 },
      );
    }
  }

  const prenom = body.prenom?.trim() || null;
  const phone = body.phone?.trim() || null;
  const capsuleNum = typeof body.capsuleNum === "number" ? body.capsuleNum : null;

  await logIncident({
    kind: "user_report",
    sessionId: body.sessionId ?? null,
    capsuleNum,
    prenom,
    email,
    phone,
    message: message.slice(0, 2000),
    context: {
      ...(body.context ?? {}),
      ua: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });

  const lignes = [
    "🆘 *Nouveau signalement Summer Business*",
    `*Message :* ${message.slice(0, 900)}`,
    `*Contact :* ${prenom ? prenom + " · " : ""}${email}${phone ? " · " + phone : ""}`,
    capsuleNum ? `*Étape :* capsule ${capsuleNum}` : null,
    body.sessionId ? `*Session :* \`${body.sessionId}\`` : null,
  ].filter(Boolean);
  await notifySlack(lignes.join("\n"));

  return NextResponse.json({ ok: true });
}
