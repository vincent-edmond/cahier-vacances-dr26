import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * POST /api/admin/hubspot-status — croise une liste d'emails (les 🔥 leads) avec HubSpot
 * pour dire aux commerciaux, lead par lead : déjà suivi (propriétaire) ? ancien contact
 * (créé avant la campagne) ? jamais contacté ? Body : { password, emails[] }.
 *
 * Le mot de passe est vérifié côté Postgres (cdv.admin_check_pass). Sans token HubSpot,
 * renvoie `configured:false` (le dashboard dégrade proprement).
 */

const HS_TOKEN = process.env.HUBSPOT_TOKEN;
const HS_CRM = "https://api.hubapi.com";
// Début de campagne : un contact HubSpot antérieur = déjà dans la base « avant Summer Business ».
const CAMPAIGN_START = Date.parse("2026-08-04T00:00:00Z");

type HsContact = { id: string; properties: Record<string, string | null> };

async function loadOwners(headers: HeadersInit): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await fetch(`${HS_CRM}/crm/v3/owners?limit=200`, { headers });
    if (!res.ok) return map;
    const data = (await res.json()) as { results?: { id: string; firstName?: string; lastName?: string; email?: string }[] };
    for (const o of data.results ?? []) {
      const name = [o.firstName, o.lastName].filter(Boolean).join(" ").trim() || o.email || o.id;
      map.set(String(o.id), name);
    }
  } catch {
    /* pas de scope owners : on affichera « assigné » sans le nom */
  }
  return map;
}

export async function POST(req: NextRequest) {
  let body: { password?: string; emails?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Base non configurée" }, { status: 500 });
  const { data: ok } = await supabase.rpc("admin_check_pass", { p_pass: body.password ?? "" });
  if (ok !== true) return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });

  const emails = (body.emails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean).slice(0, 50);
  if (!HS_TOKEN) return NextResponse.json({ configured: false, statuses: {} });
  if (emails.length === 0) return NextResponse.json({ configured: true, statuses: {} });

  const headers = { Authorization: `Bearer ${HS_TOKEN}`, "Content-Type": "application/json" };
  const props = [
    "email", "createdate", "hubspot_owner_id", "lifecyclestage", "notes_last_contacted", "hs_lead_status",
    // Déjà client MM / 3MD / 3MP ? (plusieurs propriétés croisées pour fiabilité)
    "achat_produit", "client_mm", "clients_3m", "n3m___clients",
  ];

  const statuses: Record<string, unknown> = {};
  try {
    const [batchRes, owners] = await Promise.all([
      fetch(`${HS_CRM}/crm/v3/objects/contacts/batch/read`, {
        method: "POST",
        headers,
        body: JSON.stringify({ idProperty: "email", properties: props, inputs: emails.map((e) => ({ id: e })) }),
      }),
      loadOwners(headers),
    ]);

    const found = new Map<string, HsContact>();
    if (batchRes.ok) {
      const data = (await batchRes.json()) as { results?: HsContact[] };
      for (const c of data.results ?? []) {
        const em = (c.properties?.email ?? "").toLowerCase();
        if (em) found.set(em, c);
      }
    } else {
      console.error("HubSpot batch read error:", batchRes.status, (await batchRes.text()).slice(0, 200));
    }

    for (const email of emails) {
      const c = found.get(email);
      if (!c) {
        statuses[email] = { in_hubspot: false, verdict: "Pas dans HubSpot", verdict_kind: "absent" };
        continue;
      }
      const p = c.properties;
      const createMs = p.createdate ? Date.parse(p.createdate) : NaN;
      const ancien = !Number.isNaN(createMs) && createMs < CAMPAIGN_START;
      const ownerId = (p.hubspot_owner_id ?? "").trim();
      const owner = ownerId ? owners.get(ownerId) || "assigné" : null;
      const lastContacted = p.notes_last_contacted ? p.notes_last_contacted.slice(0, 10) : null;

      // Déjà client MM / 3MD / 3MP ? achat_produit = liste all-time, croisée avec les
      // statuts actifs (client_mm, clients_3m) pour fiabilité.
      const achat = (p.achat_produit || "").split(";").map((s) => s.trim());
      const choix3m = p.clients_3m || ""; // "3MD Actif" / "3MP Actif"
      const client_programs: string[] = [];
      if (achat.includes("MM") || (p.client_mm || "").startsWith("MM")) {
        const st = (p.client_mm || "").replace(/^MM\s*/i, "").trim(); // Actif / Non Actif / En Pause
        client_programs.push(st ? `MM ${st}` : "MM");
      }
      if (achat.includes("3MD") || choix3m.includes("3MD")) client_programs.push("3MD");
      if (achat.includes("3MP") || choix3m.includes("3MP")) client_programs.push("3MP");

      let verdict: string;
      let kind: string;
      if (owner) {
        verdict = `Suivi par ${owner}`;
        kind = "suivi";
      } else if (lastContacted) {
        verdict = `Déjà contacté (${lastContacted})`;
        kind = "contacte";
      } else if (ancien) {
        verdict = "Ancien contact, jamais contacté";
        kind = "a_rappeler";
      } else {
        verdict = "Nouveau lead, jamais contacté";
        kind = "a_contacter";
      }

      statuses[email] = {
        in_hubspot: true,
        created_at: p.createdate ? p.createdate.slice(0, 10) : null,
        ancien,
        owner,
        last_contacted: lastContacted,
        lifecycle: p.lifecyclestage ?? null,
        client_programs, // ["MM Actif", "3MD", …] ou [] si non client MM/3MD/3MP
        verdict,
        verdict_kind: kind,
      };
    }
  } catch (e) {
    console.error("hubspot-status failed:", (e as Error).message);
    return NextResponse.json({ configured: true, statuses: {}, error: "HubSpot indisponible" });
  }

  return NextResponse.json({ configured: true, statuses });
}
