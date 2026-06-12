import type { CapsuleProgress, ExerciceReponses, Participant } from "@/lib/types";

// ─── Identité anonyme (localStorage) ────────────────────────────────────────
// Pas d'auth : un id anonyme en localStorage suffit à sauver la progression.

const SID_KEY = "cdv_session";
const PRENOM_KEY = "cdv_prenom";
const PREVIEW_KEY = "cdv_preview";
const PARTICIPANT_KEY = "cdv_participant";
const QUALIF_KEY = "cdv_qualif";
const ATTR_KEY = "cdv_attribution";
const progressKey = (sid: string) => `cdv_progress_${sid}`;

function uid(): string {
  return `cdv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Renvoie l'id de session anonyme, en le créant au premier appel. */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = uid();
    localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

export function getPrenom(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PRENOM_KEY) ?? "";
}

export function setPrenom(prenom: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRENOM_KEY, prenom.trim());
}

// ─── Mode preview (démo avant le drip réel) ─────────────────────────────────

// Démo ON par défaut (tout débloqué) tant qu'on est en phase de prévisualisation,
// avant le vrai lancement du drip (C1 le 02/07). Coupable explicitement via le toggle
// (stocke "0") ou `?preview=0`. À repasser sur false par défaut avant le lancement.
export function isPreview(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PREVIEW_KEY) !== "0";
}

export function setPreview(on: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREVIEW_KEY, on ? "1" : "0");
}

// ─── Opt-in / identité durable ──────────────────────────────────────────────

/** Participant identifié (après opt-in), ou null. */
export function getParticipant(): Participant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PARTICIPANT_KEY);
    return raw ? (JSON.parse(raw) as Participant) : null;
  } catch {
    return null;
  }
}

/** A déjà créé son espace (opt-in fait) ? Gate du retour Max IA. */
export function hasOptedIn(): boolean {
  return getParticipant() !== null;
}

function setParticipantLocal(p: Participant): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(p));
}

/** Profil de qualif (CA + secteur) — sert à personnaliser le retour Max IA. */
export function getQualif(): { ca?: string; secteur?: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QUALIF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAttribution(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ATTR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Adopte une session canonique (reconnexion) : recharge si elle diffère du local. */
function adoptSession(sessionId: string): boolean {
  if (typeof window === "undefined" || !sessionId) return false;
  const current = localStorage.getItem(SID_KEY);
  if (current === sessionId) return false;
  localStorage.setItem(SID_KEY, sessionId);
  return true; // l'appelant déclenchera un reload pour recharger la progression
}

/** Étape 1 de l'opt-in : prénom + email → crée/retrouve l'espace. */
export async function optinSignup(
  prenom: string,
  email: string,
): Promise<{ ok: boolean; switched: boolean; existing: boolean; error?: string }> {
  const sessionId = getOrCreateSessionId();
  try {
    const res = await fetch("/api/optin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "signup", prenom, email, sessionId, attribution: getAttribution() }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, switched: false, existing: false, error: data.error };
    }
    const data = (await res.json()) as { token: string; prenom: string; sessionId: string; existing?: boolean };
    setParticipantLocal({ token: data.token, email: email.trim().toLowerCase(), prenom: data.prenom || prenom });
    setPrenom(data.prenom || prenom);
    const switched = data.sessionId ? adoptSession(data.sessionId) : false;
    return { ok: true, switched, existing: !!data.existing };
  } catch {
    return { ok: false, switched: false, existing: false };
  }
}

/** Étape 2 de l'opt-in : CA + secteur (+ tél) → qualif HubSpot + lead_quality. */
export async function optinQualify(
  ca: string,
  secteur: string,
  phone: string,
  country?: string,
): Promise<{ ok: boolean; error?: string }> {
  const p = getParticipant();
  if (!p) return { ok: false };
  try {
    const res = await fetch("/api/optin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "qualify", token: p.token, email: p.email, prenom: p.prenom, ca, secteur, phone, country, attribution: getAttribution() }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error };
    }
    // Persiste le profil seulement après validation serveur (sert au feedback Max IA
    // et au calcul du coût de l'inaction). L'event rafraîchit les blocs coût en direct.
    if (typeof window !== "undefined") {
      localStorage.setItem(QUALIF_KEY, JSON.stringify({ ca, secteur }));
      window.dispatchEvent(new Event("cdv:qualif"));
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Reconnexion par email (autre appareil / cache vidé). */
export async function optinLogin(
  email: string,
): Promise<{ ok: boolean; found: boolean; switched: boolean }> {
  try {
    const res = await fetch("/api/optin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "login", email }),
    });
    if (!res.ok) return { ok: false, found: false, switched: false };
    const data = (await res.json()) as { found: boolean; token?: string; prenom?: string; sessionId?: string };
    if (!data.found || !data.token) return { ok: true, found: false, switched: false };
    setParticipantLocal({ token: data.token, email: email.trim().toLowerCase(), prenom: data.prenom || "" });
    if (data.prenom) setPrenom(data.prenom);
    const switched = data.sessionId ? adoptSession(data.sessionId) : false;
    return { ok: true, found: true, switched };
  } catch {
    return { ok: false, found: false, switched: false };
  }
}

// ─── Progression locale ─────────────────────────────────────────────────────

export function getAllProgressLocal(sid: string): CapsuleProgress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(progressKey(sid));
    return raw ? (JSON.parse(raw) as CapsuleProgress[]) : [];
  } catch {
    return [];
  }
}

export function getCapsuleProgressLocal(sid: string, num: number): CapsuleProgress | null {
  return getAllProgressLocal(sid).find((p) => p.capsuleNum === num) ?? null;
}

function writeProgressLocal(sid: string, list: CapsuleProgress[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(progressKey(sid), JSON.stringify(list));
}

function upsertLocal(sid: string, patch: Partial<CapsuleProgress> & { capsuleNum: number }): CapsuleProgress {
  const list = getAllProgressLocal(sid);
  const idx = list.findIndex((p) => p.capsuleNum === patch.capsuleNum);
  const base: CapsuleProgress = idx >= 0
    ? list[idx]
    : { capsuleNum: patch.capsuleNum, vu: false, reponses: null, feedbackIA: null, doneAt: null, updatedAt: "" };
  const merged: CapsuleProgress = { ...base, ...patch, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = merged;
  else list.push(merged);
  writeProgressLocal(sid, list);
  return merged;
}

// ─── Synchronisation serveur (best-effort) ──────────────────────────────────

/** Récupère la progression serveur et la fusionne dans le local. */
export async function syncProgressFromServer(sid: string): Promise<CapsuleProgress[]> {
  try {
    const res = await fetch(`/api/progression?sessionId=${encodeURIComponent(sid)}`);
    if (res.ok) {
      const data = (await res.json()) as { progress?: CapsuleProgress[] };
      if (Array.isArray(data.progress) && data.progress.length) {
        writeProgressLocal(sid, data.progress);
        return data.progress;
      }
    }
  } catch {
    /* hors-ligne ou Supabase non configuré : on garde le local */
  }
  return getAllProgressLocal(sid);
}

/** Marque une capsule comme vue (vidéo regardée). */
export function markVu(sid: string, num: number): CapsuleProgress {
  const updated = upsertLocal(sid, { capsuleNum: num, vu: true });
  fetch("/api/progression", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: sid, capsuleNum: num, vu: true }),
  }).catch(() => {});
  return updated;
}

/**
 * Soumet l'exercice : appelle Claude (via l'API) pour le feedback, sauve tout.
 * `skipFeedback` : persiste seulement les réponses, sans appel IA (utilisé en C9,
 * où le feedback est remplacé par la synthèse complète du plan H2).
 * Renvoie le feedback (ou null si l'IA est indisponible / ignorée).
 */
export async function submitExercice(
  sid: string,
  num: number,
  reponses: ExerciceReponses,
  opts?: { skipFeedback?: boolean }
): Promise<{ feedbackIA: string | null; progress: CapsuleProgress }> {
  let feedbackIA: string | null = null;
  try {
    const res = await fetch("/api/exercice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        capsuleNum: num,
        reponses,
        skipFeedback: opts?.skipFeedback,
        profil: getQualif() ?? undefined,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { feedbackIA?: string | null };
      feedbackIA = data.feedbackIA ?? null;
    }
  } catch {
    /* on persiste quand même les réponses en local ci-dessous */
  }

  const progress = upsertLocal(sid, {
    capsuleNum: num,
    reponses,
    ...(opts?.skipFeedback ? {} : { feedbackIA }),
    doneAt: new Date().toISOString(),
  });
  return { feedbackIA, progress };
}

// ─── Plan d'action final (synthèse C9) ──────────────────────────────────────

const planKey = (sid: string) => `cdv_plan_${sid}`;

export function getPlanLocal(sid: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(planKey(sid));
}

function savePlanLocal(sid: string, plan: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(planKey(sid), plan);
}

/**
 * Compile le plan d'action H2 à partir de TOUT le cahier (réponses C1→C9).
 * Récupère d'abord l'historique complet (serveur + local), puis l'envoie à Claude.
 */
export async function generatePlan(sid: string): Promise<string | null> {
  const progress = await syncProgressFromServer(sid);
  try {
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress, profil: getQualif() ?? undefined }),
    });
    if (res.ok) {
      const data = (await res.json()) as { plan?: string | null };
      if (data.plan) {
        savePlanLocal(sid, data.plan);
        return data.plan;
      }
    }
  } catch {
    /* indisponible */
  }
  return null;
}
