import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { resolveMx } from "node:dns/promises";
import { getSupabase } from "@/lib/supabase";
import { HS_FIELD, caLeadQuality } from "@/lib/optin";
import { validateEmailFormat, emailDomain, validatePhone } from "@/lib/validation";
import type { CountryCode } from "libphonenumber-js";

/**
 * Le domaine email reçoit-il des emails (enregistrements MX) ?
 * true = oui · false = domaine inexistant/sans mail (bloquer) · null = lookup
 * impossible (timeout/réseau) → on n'aveugle pas un vrai utilisateur (fail open).
 */
async function domainHasMx(domain: string): Promise<boolean | null> {
  if (!domain) return false;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<null>((res) => setTimeout(() => res(null), 3500)),
    ]);
    if (records === null) return null; // timeout → fail open
    return Array.isArray(records) && records.length > 0;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "NXDOMAIN" || code === "ENODATA") return false;
    return null; // erreur transitoire → fail open
  }
}

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
const HS_DATE_PROP = process.env.HUBSPOT_DATE_PROP || "date_optin_summer_business";
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

function cleanMap(m: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) if (v != null && v !== "") out[k] = v;
  return out;
}

/**
 * Upsert contact via CRM API. Crée s'il n'existe pas. S'il existe, politique HYBRIDE :
 *  - `fillIfEmpty` (prénom, attribution, date opt-in) : écrit SEULEMENT si vide (first-touch).
 *  - `refresh` (tél, CA, secteur) : écrit la valeur fraîche si vide OU différente (auto-déclaré
 *    récent = le plus fiable). Jamais d'écrasement de l'attribution. No-op sans token.
 */
async function hubspotUpsertContact(
  email: string,
  fillIfEmpty: Record<string, string | undefined>,
  refresh: Record<string, string | undefined>,
): Promise<void> {
  if (!HS_TOKEN) return;
  const fe = cleanMap(fillIfEmpty);
  const rf = cleanMap(refresh);
  const all = { ...fe, ...rf };
  if (Object.keys(all).length === 0) return;

  const headers = { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" };
  const propList = Object.keys(all).join(",");

  try {
    const getRes = await fetch(
      `${HS_CRM}/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email&properties=${propList}`,
      { headers },
    );

    if (getRes.status === 404) {
      const res = await fetch(`${HS_CRM}/crm/v3/objects/contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ properties: { email, ...all } }),
      });
      await logIfError("create", res);
      return;
    }
    if (!getRes.ok) {
      console.error("HubSpot get error:", getRes.status, (await getRes.text()).slice(0, 250));
      return;
    }

    const contact = (await getRes.json()) as { id: string; properties: Record<string, string | null> };
    const existing = (k: string) => (contact.properties?.[k] ?? "").toString().trim();
    const patch: Record<string, string> = {};
    for (const [k, v] of Object.entries(fe)) if (!existing(k)) patch[k] = v; // first-touch
    for (const [k, v] of Object.entries(rf)) if (existing(k) !== v) patch[k] = v; // rafraîchi si différent (ou vide)
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
    country?: string;
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
    const leadQuality = ca ? caLeadQuality(ca) : undefined;

    // Téléphone : validé selon l'indicatif pays choisi + normalisé E.164 (anti-bidon).
    const country = (body.country || "FR") as CountryCode;
    const phoneCheck = validatePhone(body.phone ?? "", country);
    if (!phoneCheck.ok) return NextResponse.json({ error: phoneCheck.reason }, { status: 400 });
    const phone = phoneCheck.e164;

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
      await hubspotUpsertContact(
        email,
        {
          // first-touch / set-once : prénom + attribution Summer Business + date d'opt-in
          [HS_FIELD.firstname]: prenom,
          hs_google_click_id: body.attribution?.gclid,
          hs_facebook_click_id: body.attribution?.fbclid,
          [HS_SOURCE_PROP]: buildSourceString(body.attribution),
          [HS_DATE_PROP]: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
        },
        {
          // rafraîchi avec la valeur fraîche (auto-déclaré récent = le plus fiable)
          [HS_FIELD.phone]: phone,
          [HS_FIELD.ca]: ca,
          [HS_FIELD.secteur]: secteur,
        },
      );
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

    // Anti-bidon : syntaxe + domaine jetable/factice, puis vérif MX du domaine.
    const fmt = validateEmailFormat(email);
    if (!fmt.ok) return NextResponse.json({ error: fmt.reason }, { status: 400 });
    if ((await domainHasMx(emailDomain(email))) === false) {
      return NextResponse.json({ error: "Ce domaine email ne reçoit pas d'emails. Vérifiez l'adresse." }, { status: 400 });
    }

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
