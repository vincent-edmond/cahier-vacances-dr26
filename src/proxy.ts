import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * A/B test sur la page d'accueil `/`.
 *   Variante A = LP actuelle (`/`, servie telle quelle).
 *   Variante B = `/lp-b` (réécriture INTERNE : l'URL du navigateur reste `/`, les `?utm_...` intacts).
 *
 * - Cookie collant `ab_lp` (60 j) : chaque visiteur revoit toujours la même variante.
 * - Split 50/50 à la première visite.
 * - `?lp=a` / `?lp=b` : forçage pour tester sans exposer le split (marche même AB éteint).
 * - Kill-switch : si `AB_TEST_ENABLED` != "true" (et pas de forçage), on ne touche à rien
 *   → 100% variante A (la LP actuelle est servie normalement).
 *
 * En Next.js 16, le fichier « middleware » s'appelle « proxy ».
 */
// ═══ INTERRUPTEUR DU TEST A/B ═══
//   true  = split 50/50 actif, CIBLÉ MÉTA (A = LP actuelle · B = nouvelle)
//   false = kill-switch → 100% LP actuelle (le `/` est servi inchangé)
// Bascule = cette seule ligne + un push (aucune variable Netlify nécessaire).
const AB_TEST_ENABLED = true;

/**
 * Trafic Meta payant ? (fbclid, ou utm_source facebook/meta/instagram). Seul ce trafic
 * entre dans le test A/B — l'email / l'organique / le direct gardent la LP A éprouvée.
 */
function isPaidMeta(request: NextRequest): boolean {
  const p = request.nextUrl.searchParams;
  if (p.get("fbclid")) return true;
  const src = (p.get("utm_source") || "").toLowerCase();
  return /(facebook|meta|instagram|^ig$|^fb$)/.test(src);
}

export function proxy(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("lp"); // "a" | "b"
  const enabled = AB_TEST_ENABLED;

  let variant = request.cookies.get("ab_lp")?.value;
  if (force === "a") variant = "A";
  else if (force === "b") variant = "B";

  // Test éteint et pas de forçage → LP actuelle servie sans aucune modification.
  if (!enabled && !force) return NextResponse.next();

  if (variant !== "A" && variant !== "B") {
    // Pas encore dans le test : on n'assigne une variante QU'au trafic Meta (ou forçage).
    // Hors Meta (email/organique/direct) → LP A servie normalement, aucun cookie.
    if (!force && !isPaidMeta(request)) return NextResponse.next();
    variant = Math.random() < 0.5 ? "A" : "B";
  }

  const res =
    variant === "B"
      ? NextResponse.rewrite(new URL(`/lp-b${request.nextUrl.search}`, request.url))
      : NextResponse.next();

  res.cookies.set("ab_lp", variant, {
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 jours
    sameSite: "lax",
  });
  return res;
}

export const config = { matcher: "/" };
