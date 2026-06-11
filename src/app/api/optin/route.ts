import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabase } from "@/lib/supabase";
import { HS_FIELD, caLeadQuality } from "@/lib/optin";

/**
 * POST /api/optin — opt-in & identité durable.
 *
 *  mode "signup"  : { prenom, email, sessionId, attribution } → crée/retrouve le
 *                   participant (clé = email), pousse firstname+email dans HubSpot.
 *                   Renvoie { token, sessionId (canonique), prenom, existing }.
 *  mode "qualify" : { token, email, ca, secteur, phone } → complète CA/secteur,
 *                   recalcule lead_quality, pousse CA/secteur/phone dans HubSpot.
 *  mode "login"   : { email } → reconnexion par email → { found, token, prenom, sessionId }.
 *
 * Best-effort : si Supabase / HubSpot non configurés, l'opt-in n'échoue pas côté UX.
 */

const HS_PORTAL = process.env.HUBSPOT_PORTAL_ID || "27215892";
const HS_FORM = process.env.HUBSPOT_FORM_GUID; // 991c1d4e-41a7-4acd-946e-a5de913ee71f
const HS_SUBMIT = (portal: string, form: string) =>
  `https://api-eu1.hsforms.com/submissions/v3/integration/submit/${portal}/${form}`;

// CRM API (app privée) : permet « créer OU compléter uniquement les champs vides ».
// api.hubapi.com est global (vaut aussi pour les portails EU).
const HS_TOKEN = process.env.HUBSPOT_TOKEN; // pat-eu1-…  (secret, server-only)
const HS_SOURCE_PROP = process.env.HUBSPOT_SOURCE_PROP || "source_summer_business";
const HS_CRM = "https://api.hubapi.com";

type Attribution = Record<string, string> | null | undefined;

/** Concatène l'attribution UTM en une chaîne lisible pour la propriété « source ». */
function buildSourceString(a?: Attribution): string | undefined {
  if (!a) return undefined;
  const parts = [a.utm_source, a.utm_medium, a.utm_campaign].map((x) => (x || "").trim()).filter(Boolean);
  return parts.length ? parts.join(" / ") : undefined;
}

async function logIfError(label: string, res: Response): Promise<void> {
  if (!res.ok) console.error(`HubSpot ${label} error:`, res.status, (await res.text()).slice(0, 250));
}

/**
 * Upsert contact via CRM API : crée s'il n'existe pas, sinon ne complète QUE les
 * propriétés actuellement vides côté HubSpot (jamais d'écrasement). No-op sans token.
 */
async function hubspotUpsertContact(email: string, desired: Record<string, string | undefined>): Promise<void> {
  if (!HS_TOKEN) return;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(desired)) if (v != null && v !== "") clean[k] = v;
  if (Object.keys(clean).length === 0) return;

  const headers = { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" };
  const propList = Object.keys(clean).join(",");

  try {
    const getRes = await fetch(
      `${HS_CRM}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=${propList}`,
      { headers },
    );

    if (getRes.status === 404) {
      const res = await fetch(`${HS_CRM}/crm/v3/objects/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ properties: { email, ...clean } }),
      });
      await logIfError("create", res);
      return;
    }
    if (!getRes.ok) {
      console.error("HubSpot get error:", getRes.status, (await getRes.text()).slice(0, 250));
      return;
    }

    const contact = (await getRes.json()) as { id: string; properties: Record<string, string | null> };
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(clean)) {
      const existing = (contact.properties?.[k] ?? "").toString().trim();
      if (!existing) patch[k] = v; // uniquement si vide côté HubSpot
    }
    if (Object.keys(patch).length === 0) return;

    const res = await fetch(`${HS_CRM}/crm/v3/objects/contacts/${contact.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ properties: patch }),
    });
    await logIfError("patch", res);
  } catch (e) {
    console.error("HubSpot upsert failed:", (e as Error).message);
  }
}

/** Soumission HubSpot Forms API (idempotente : dédoublonne le contact par email). */
async function submitHubspot(
  fields: Record<string, string | undefined>,
  ctx: { hutk?: string; pageUri?: string },
): Promise<void> {
  if (!HS_FORM) return; // pas encore branché → no-op
  const payload = {
    fields: Object.entries(fields)
      .filter(([, v]) => v != null && v !== "")
      .map(([name, value]) => ({ name, value: value as string })),
    context: {
      ...(ctx.hutk ? { hutk: ctx.hutk } : {}),
      pageUri: ctx.pageUri || "https://summer-business.netlify.app/",
      pageName: "Summer Business — opt-in",
    },
  };
  try {
    const res = await fetch(HS_SUBMIT(HS_PORTAL, HS_FORM), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("HubSpot submit error:", res.status, txt.slice(0, 300));
    }
  } catch (e) {
    console.error("HubSpot submit failed:", (e as Error).message);
  }
}

export async function POST(req: NextRequest) {
  let body: {
    mode?: "signup" | "qualify" | "login";
    prenom?: string;
    email?: string;
    sessionId?: string;
    ca?: string;
    secteur?: string;
    phone?: string;
    token?: string;
    attribution?: Attribution;
  };
  // Le formulaire HubSpot exige firstname + CA ensemble : on soumet TOUT en une
  // fois à l'étape qualify (pas à signup).
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const mode = body.mode;
  const email = body.email?.trim().toLowerCase();
  const supabase = getSupabase();
  const hutk = req.cookies.get("hubspotutk")?.value;
  const pageUri = req.headers.get("referer") || undefined;

  // ─── LOGIN : reconnexion par email ────────────────────────────────────────
  if (mode === "login") {
    if (!email) return NextResponse.json({ error: "email requis" }, { status: 400 });
    if (!supabase) return NextResponse.json({ found: false, configured: false });
    const { data, error } = await supabase.rpc("find_participant", { p_email: email });
    if (error) console.error("find_participant error:", error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return NextResponse.json({ found: false, configured: true });
    return NextResponse.json({
      found: true,
      token: row.token,
      prenom: row.prenom ?? "",
      sessionId: row.session_id ?? "",
      configured: true,
    });
  }

  // ─── QUALIFY : complète CA / secteur / tél ────────────────────────────────
  if (mode === "qualify") {
    if (!email) return NextResponse.json({ error: "email requis" }, { status: 400 });
    const prenom = body.prenom?.trim();
    const ca = body.ca?.trim();
    const secteur = body.secteur?.trim();
    const phone = body.phone?.trim();
    const leadQuality = ca ? caLeadQuality(ca) : undefined;

    if (supabase) {
      // Via RPC security-definer (bypasse RLS : un UPDATE direct serait filtré à 0
      // ligne faute de policy SELECT — choix volontaire pour ne pas exposer les emails).
      const { error } = await supabase.rpc("set_participant_qualif", {
        p_email: email,
        p_ca: ca ?? null,
        p_secteur: secteur ?? null,
        p_phone: phone ?? null,
        p_lead_quality: leadQuality ?? null,
      });
      if (error) console.error("set_participant_qualif error:", error.message);
    }

    // HubSpot : via CRM API (créer ou compléter-les-vides) si token présent ;
    // sinon repli Forms API (écrase, soumission complète car firstname+CA requis ensemble).
    if (HS_TOKEN) {
      await hubspotUpsertContact(email, {
        [HS_FIELD.firstname]: prenom,
        [HS_FIELD.phone]: phone,
        [HS_FIELD.ca]: ca,
        [HS_FIELD.secteur]: secteur,
        hs_google_click_id: body.attribution?.gclid,
        hs_facebook_click_id: body.attribution?.fbclid,
        [HS_SOURCE_PROP]: buildSourceString(body.attribution),
      });
    } else {
      await submitHubspot(
        {
          [HS_FIELD.firstname]: prenom,
          [HS_FIELD.email]: email,
          [HS_FIELD.ca]: ca,
          [HS_FIELD.secteur]: secteur,
          [HS_FIELD.phone]: phone,
        },
        { hutk, pageUri },
      );
    }

    return NextResponse.json({ ok: true, leadQuality });
  }

  // ─── SIGNUP : crée / retrouve le participant (clé = email) ─────────────────
  if (mode === "signup") {
    const prenom = body.prenom?.trim() ?? "";
    const sessionId = body.sessionId?.trim() ?? "";
    if (!email) return NextResponse.json({ error: "email requis" }, { status: 400 });

    let token = "";
    let canonicalSession = sessionId;
    let existing = false;
    let existingPrenom = prenom;

    if (supabase) {
      const { data, error } = await supabase.rpc("find_participant", { p_email: email });
      if (error) console.error("find_participant error:", error.message);
      const row = Array.isArray(data) ? data[0] : data;

      if (row) {
        existing = true;
        token = row.token;
        canonicalSession = row.session_id || sessionId;
        existingPrenom = row.prenom || prenom;
      } else {
        token = randomUUID();
        const { error: insErr } = await supabase.from("participants").insert({
          token,
          email,
          prenom: prenom || null,
          session_id: sessionId || null,
          attribution: body.attribution ?? null,
        });
        if (insErr) console.error("participants insert error:", insErr.message);
      }
    } else {
      token = randomUUID();
    }

    // Pas de soumission HubSpot ici : le formulaire exige firstname + CA ensemble,
    // donc on pousse le lead complet à l'étape qualify.

    return NextResponse.json({
      ok: true,
      token,
      prenom: existingPrenom,
      sessionId: canonicalSession,
      existing,
      configured: !!supabase,
    });
  }

  return NextResponse.json({ error: "mode invalide" }, { status: 400 });
}
