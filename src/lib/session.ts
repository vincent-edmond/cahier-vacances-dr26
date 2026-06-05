import type { CapsuleProgress, ExerciceReponses } from "@/lib/types";

// ─── Identité anonyme (localStorage) ────────────────────────────────────────
// Pas d'auth : un id anonyme en localStorage suffit à sauver la progression.

const SID_KEY = "cdv_session";
const PRENOM_KEY = "cdv_prenom";
const PREVIEW_KEY = "cdv_preview";
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

export function isPreview(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PREVIEW_KEY) === "1";
}

export function setPreview(on: boolean): void {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(PREVIEW_KEY, "1");
  else localStorage.removeItem(PREVIEW_KEY);
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
      body: JSON.stringify({ sessionId: sid, capsuleNum: num, reponses, skipFeedback: opts?.skipFeedback }),
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
      body: JSON.stringify({ progress }),
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
