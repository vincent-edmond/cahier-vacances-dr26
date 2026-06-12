# Le Cahier de Vacances DR26 — État du projet (référence persistante)

> Mis à jour : 2026-06-05. Ce fichier est la mémoire du projet. À relire au début de chaque session.

---

## 🎯 Vue d'ensemble

**Le Cahier de Vacances du Chef d'Entreprise** — espace web boosté à l'IA pour Max Piccinini.
9 capsules business (« le contre-pied de l'été ») qui se débloquent au fil de l'été, du bilan
de mi-année (C1, jeudi 02/07) au plan d'action H2 (C9, 27/08). 1 capsule chaque jeudi. Pont vers Destination Réussite (25-27/09).

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
| `/admin` | Back-office (KPIs leads/sources/qualité/engagement) protégé par mot de passe |
| `POST /api/admin/overview` | Agrégats admin via `cdv.admin_overview(p_pass)` (bcrypt, security-definer) |

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

- Déblocage réel par date (`dateUnlock` dans capsules.json) : **1 capsule chaque jeudi**, C1 le 02/07 → C9 le 27/08/2026.
- Aujourd'hui (avant 02/07) tout est verrouillé en réel. **Mode démo** pour tester : `/espace?preview=1`
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
- [x] **Netlify env — EN PLACE & PROD VÉRIFIÉE ✅** (ajoutées via l'UI : `NEXT_PUBLIC_GTM_ID`=GTM-MVH3FZ3, `HUBSPOT_PORTAL_ID`, `HUBSPOT_FORM_GUID`, `HUBSPOT_TOKEN` (secret), en plus de Supabase + Anthropic). Testé en prod 2026-06-11 : opt-in → **contact HubSpot créé** avec mapping complet (CA/secteur/tél E.164/gclid/fbclid/source/date) + **GTM-MVH3FZ3 inliné** dans le bundle + `generate_lead` ingéré.
  - ⚠️ Note durable : le **connecteur Netlify (MCP) n'écrit PAS** les variables (faux « success ») → toute nouvelle var doit être ajoutée **dans l'UI Netlify**, puis *Clear cache and deploy* (les `NEXT_PUBLIC_*` sont inlinées au build).
- [ ] **Vidéos C1→C9** : remplacer `videoUrl: null` par les embeds une fois tournées.
- [ ] **Fiches C2→C9** : enrichir/distiller depuis les transcripts préconisés (cf. `_cahier-vacances-docs/Capsules-DR26-Plan-Detaille.md`).

### Phase 2 — identité durable + opt-in — FAIT ✅ (commit `6dd3f57`)
- [x] **Opt-in + identité durable** (HubSpot Forms API + GTM SS). Déclenché à la **1ʳᵉ demande de retour Max IA** (toute capsule, **une seule fois**) ; reconnexion par **email simple**.
  - **Modale 2 étapes** (`OptInModal`) : prénom+email → CA+secteur (tél optionnel). CA+secteur **obligatoires** (servent la classification lead + personnalisent le retour de Max IA, passés à `generateExerciceFeedback`). Porte « j'ai déjà un espace » = reconnexion.
  - **Table `cdv.participants`** (clé=email, `token`, `session_id` canonique, `lead_quality`, `attribution`). RLS **sans SELECT large** ; lecture/maj via fonctions security-definer `cdv.find_participant` / `cdv.set_participant_qualif` → emails non dumpables via la clé anon. Reconnexion = on adopte le `session_id` canonique (rattache le cahier déjà commencé).
  - **`/api/optin`** (signup / qualify / login) → **HubSpot API CRM** (app privée, `HUBSPOT_TOKEN` secret). À la qualif : **crée le contact, ou maj HYBRIDE** si existant : profil (tél/CA/secteur) **rafraîchi** avec la valeur fraîche si différente ; prénom + attribution + date = **first-touch** (jamais écrasés). Repli Forms API si pas de token. **Le tél est obligatoire** dans la modale (le form HubSpot natif n'est plus utilisé). ✅ Testé bout-en-bout (création, mapping, hybride, anti-bidon).
  - **Mapping HubSpot** : prénom=`firstname`, tél=`phone` (normalisé **E.164**), CA=`chiffre_d_affaires_annuel_new`, secteur=`secteur_dactivite_summer_business` (le **\_summer\_business**, ≠ Max Piccinini), **gclid→`hs_google_click_id`**, **fbclid→`hs_facebook_click_id`**, **utm_source/medium/campaign concaténés→`source_summer_business`**, **date du 1er opt-in→`date_optin_summer_business`** (créée par l'app ; permet de filtrer les leads SB par source + date).
  - **Anti-bidon** (`src/lib/validation.ts`) : email syntaxe + blocage jetables/factices + **vérif MX** du domaine (serveur, fail-open) ; tél validé via **libphonenumber-js** (FR + intl). Inline dans la modale + contrôle serveur autoritaire.
  - Reste optionnel : envoi d'email (différé), page `/espace/[token]` (pas nécessaire, l'identité tient via localStorage + reconnexion email).
- [x] **Tracking GTM server-side** : conteneur **`GTM-MVH3FZ3`** chargé ; `dataLayer` → `page_view` + **`generate_lead`** segmenté `lead_quality` (**'quali' ≥100K = conversion optimisée** · 'classique' <100K), avec `event_id` de dédup. ✅ Testé : `generate_lead` ingéré par GTM (uniqueEventId). **Reste côté GTM SS (Vincent) : créer les 2 conversions filtrées sur `lead_quality` + brancher Meta CAPI / Google Ads.**
  - Quali = 4 tranches ≥100K (`100K–999K`, `300K–1M`, `1M–10M`, `+10M`). Voir `src/lib/optin.ts` (`caLeadQuality`).

### Phase 3
- [x] Synthèse finale : intégrée **dans la C9** (pas une page séparée). `/api/plan` + `generatePlanFinal` compilent tout le cahier (C1→C9) ; `ExerciceForm` mode `plan` sauve les derniers champs puis génère, plan persisté en localStorage (`cdv_plan_*`).
- [x] Coquille SaaS : `AppShell` (sidebar gauche desktop = nav 9 leviers + états + progression + démo + CTA DR, drawer mobile) + `Footer` partagé, responsive.
- [x] **Back-office `/admin`** — protégé par mot de passe (bcrypt en base, fonction security-definer `cdv.admin_overview`, aucune env var à ajouter). KPIs : leads total + **quali/classique**, opt-ins/jour, **par source/secteur/CA**, **entonnoir 9 étapes** (vidéos vues vs exercices), activation, plan C9, table des inscrits. Mot de passe temp : **`summer-admin-2026`** (à changer : `update cdv.admin_config set value = crypt('NOUVEAU', gen_salt('bf')) where key='password';`).
- [ ] Tracking (opt-in, progression, clics CTA DR → HubSpot / Hyros).

---

## 📚 Docs source

`_cahier-vacances-docs/` (hors repo) : `Capsules-DR26-Plan-Detaille.md`, `SaaS-Cahier-Vacances-DR26-Spec.md`,
`Structure-Capsules-Ete-DR26.md`, `C1-contenu.md` (contenu C1 intégré).
