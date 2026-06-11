# Le Cahier de Vacances DR26 — État du projet (référence persistante)

> Mis à jour : 2026-06-05. Ce fichier est la mémoire du projet. À relire au début de chaque session.

---

## 🎯 Vue d'ensemble

**Le Cahier de Vacances du Chef d'Entreprise** — espace web boosté à l'IA pour Max Piccinini.
9 capsules business (« le contre-pied de l'été ») qui se débloquent au fil de l'été, du bilan
de mi-année (C1, 30/06) au plan d'action H2 (C9, 25/08). Pont vers Destination Réussite (25-27/09).

**Dupliqué et simplifié depuis MOMENTUM** (on ne touche pas au SaaS Momentum en prod).

- **Stack** : Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · **Supabase** · **Claude** (Anthropic) · Netlify.
- **Retiré de Momentum** : Clerk (auth), MongoDB, Wistia, Pinecone, Notion, l'onboarding qualif.
- **Accès ouvert** : pas d'auth, **session anonyme** (id en `localStorage`, `cdv_session`).

Mécanique d'une capsule : **vidéo (embed) → fiche HTML → exercice sauvegardé → feedback IA Claude → CTA DR**.
> Section commentaires/communauté **retirée** (jugée non pertinente, risque de défocus). Table `cdv.comments` laissée en base (inutilisée).

---

## 🗺️ Routes

| Route | Rôle |
|---|---|
| `/` | Landing dark navy (`src/app/page.tsx`) |
| `/espace` | Hub : 9 modules, drip par date (`src/app/espace/page.tsx`) |
| `/espace/capsule/[num]` | Capsule complète (`src/app/espace/capsule/[num]/page.tsx`) |
| `POST /api/exercice` | Sauve l'exercice + feedback Claude |
| `GET/POST /api/progression` | Progression d'une session |
| `POST /api/plan` | Compile le plan H2 (synthèse C9) à partir de tout le cahier |

> Routes Momentum supprimées : sign-in/up, qualify, diagnostic, chat, dashboard, guide-*, bibliotheque, plan, api/session, api/chat, etc.

---

## 📁 Fichiers clés

- `src/data/capsules.json` — contenu des 9 capsules. **C1 complète** ; C2→C9 = métadonnées + fiche distillée + exercice (défi) + prompt feedback. À enrichir avec les vidéos au fil de l'été.
- `src/lib/types.ts` — `Capsule`, `ExerciceField`, `CapsuleProgress`, `Comment`.
- `src/lib/capsules.ts` — `getCapsules/getCapsule`, `isUnlocked(capsule,{preview})`, `formatDateFr`, `DR_URL`, `TOTAL_CAPSULES`.
- `src/lib/session.ts` — session anonyme + progression locale + sync serveur best-effort + mode preview.
- `src/lib/supabase.ts` — client serveur ; `null` si env absentes (→ bascule localStorage).
- `src/lib/providers/anthropic.ts` — `generateExerciceFeedback` (model `claude-sonnet-4-6`) + `generatePlanFinal` (synthèse C9, prête, pas encore câblée à une page).
- Composants : `AppShell` (sidebar SaaS + drawer mobile + footer), `VideoEmbed` (YouTube/Vimeo/mp4), `ExerciceForm` (champs + % calculé + feedback ou mode `plan` en C9), `CtaDR`, `Footer`.

---

## 🔑 Variables d'environnement

| Variable | Note |
|---|---|
| `ANTHROPIC_API_KEY` | Présente dans `.env.local`. Requise pour le feedback IA. |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | **Configurées** (projet `dietzone`, clé publishable). Testées OK. |

L'app accède à Supabase via la **clé publishable (anon)** depuis les routes API (RLS ouvertes pour usage anonyme public). Pas de service role nécessaire. Le client cible le schéma dédié via `{ db: { schema: 'cdv' } }`.

---

## 🗄️ Supabase — EN PLACE ✅

Org passée en **Pro** ($25/mois). Pour éviter le **+10 $/mois** de compute d'un projet
supplémentaire, le Cahier **n'a pas son propre projet** : ses 2 tables vivent dans un
**schéma dédié `cdv`** du projet existant **`dietzone`** (`rqjuyyhwzznaihqtalod`, eu-west-3),
totalement isolé des tables de dietzone (schéma à part, RLS propres).

- Schéma + tables + RLS appliqués (`supabase/schema.sql`, miroir de la migration `cdv_cahier_vacances_schema`).
- Schéma `cdv` exposé à PostgREST : `pgrst.db_schemas = 'public, graphql_public, cdv'` (additif).
- `SUPABASE_URL` + `SUPABASE_ANON_KEY` dans `.env.local`. **À reporter sur Netlify** au déploiement.
- Vérifié : `/api/progression` et `/api/exercice` persistent dans le schéma `cdv` (`configured: true`).

---

## 🎬 Drip & mode démo

- Déblocage réel par date (`dateUnlock` dans capsules.json) : C1 30/06 → C9 25/08/2026.
- Aujourd'hui (avant 30/06) tout est verrouillé en réel. **Mode démo** pour tester : `/espace?preview=1`
  (bouton « Démo » dans le hub, stocké en `localStorage` `cdv_preview`). `?preview=0` pour annuler.

---

## ✅ État (Phase 1 — socle + capsule témoin) — FAIT

- [x] Stack simplifiée (Clerk/Mongo/Wistia/Pinecone retirés, Supabase ajouté).
- [x] Landing adaptée (contre-pied de l'été).
- [x] Hub public, 9 modules, drip + statuts (à découvrir / en cours / terminé) + progression.
- [x] Capsule C1 de bout en bout : vidéo (placeholder, pas encore tournée), fiche, exercice (% auto), feedback IA Claude (testé OK), CTA DR.
- [x] `build` vert, 0 erreur TS, 0 erreur console.

## 📋 Reste à faire

### Court terme
- [x] **Supabase** : schéma `cdv` dans dietzone + clés branchées + testé OK.
- [ ] **Netlify** : reporter `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `ANTHROPIC_API_KEY` dans les env vars du site.
- [ ] **Vidéos C1→C9** : remplacer `videoUrl: null` par les embeds une fois tournées.
- [ ] **Fiches C2→C9** : enrichir/distiller depuis les transcripts préconisés (cf. `_cahier-vacances-docs/Capsules-DR26-Plan-Detaille.md`).

### Phase 2 — identité durable (décidé : à faire plus tard, pas maintenant)
- [ ] **Opt-in + identité durable** (en attente : décisions HubSpot). Décidé : passerelle **HubSpot Forms API** (portail EU, CA=`chiffre_d_affaires_annuel_new`, tél=`phone`, secteur=`secteur_d_activite_max_piccinini`), capture UTM/hutk (faite), **reconnexion = email simple** (pas de lien magique, pas d'envoi d'email). Modèle : 1er opt-in → `cdv.participants(token,email,...)` clé=email → mémoire durable ; retour même appareil = auto (token localStorage) ; autre appareil = ressaisir l'email.
  - Limite actuelle : l'identité = id anonyme en `localStorage` (`cdv_session`). Espace bien isolé par utilisateur, mais perdu si cache vidé / autre navigateur / autre appareil, et pas d'email capté.
  - Cible (déjà dans la spec) : opt-in prénom+email → table `cdv.participants (token, email, prenom)` → page `/espace/[token]` → progression rattachée au **token** (récupérer le cahier anonyme déjà commencé via le `session_id` courant). Le lien = la clé d'accès.
  - Envoi d'email : **différé** (décision : pas d'email pour l'instant). Quand on l'active : N8N/HubSpot (déjà en place) ou Resend.

### Phase 3
- [x] Synthèse finale : intégrée **dans la C9** (pas une page séparée). `/api/plan` + `generatePlanFinal` compilent tout le cahier (C1→C9) ; `ExerciceForm` mode `plan` sauve les derniers champs puis génère, plan persisté en localStorage (`cdv_plan_*`).
- [x] Coquille SaaS : `AppShell` (sidebar gauche desktop = nav 9 leviers + états + progression + démo + CTA DR, drawer mobile) + `Footer` partagé, responsive.
- [ ] Back-office léger `/admin` (inscrits, suivi des cahiers).
- [ ] Tracking (opt-in, progression, clics CTA DR → HubSpot / Hyros).

---

## 📚 Docs source

`_cahier-vacances-docs/` (hors repo) : `Capsules-DR26-Plan-Detaille.md`, `SaaS-Cahier-Vacances-DR26-Spec.md`,
`Structure-Capsules-Ete-DR26.md`, `C1-contenu.md` (contenu C1 intégré).
