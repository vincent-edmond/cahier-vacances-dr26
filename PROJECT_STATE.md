# Le Cahier de Vacances DR26 — État du projet (référence persistante)

> Mis à jour : 2026-08-26. Ce fichier est la mémoire du projet. À relire au début de chaque session.
> Nom public du produit : **Summer Business** (domaine prod : `summer-business.maxpiccinini.com`).
> ⭐ **FOCUS ACTUEL** : pivot vers un **audit/diagnostic evergreen** (voir la section « 🩺 PIVOT EVERGREEN » juste sous la Vue d'ensemble). Le SaaS « cahier de vacances » ci-dessous reste la base technique réutilisée.

---

## 🎯 Vue d'ensemble

**Le Cahier de Vacances du Chef d'Entreprise** — espace web boosté à l'IA pour Max Piccinini.
9 capsules business (« le contre-pied de l'été ») qui se débloquent au fil de l'été, du bilan
de mi-année (C1, mar 04/08) au plan d'action du S2 (C9, mar 25/08). 7 dates de déblocage pour 9 capsules (2 doubles : C3+C4 le 11/08, C6+C7 le 18/08), cadence mardi/vendredi. Pont vers Destination Réussite (25-27/09).

**Dupliqué et simplifié depuis MOMENTUM** (on ne touche pas au SaaS Momentum en prod).

- **Stack** : Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · **Supabase** · **Claude** (Anthropic) · Netlify.
- **Retiré de Momentum** : Clerk (auth), MongoDB, Wistia, Pinecone, Notion, l'onboarding qualif.
- **Accès ouvert** : pas d'auth, **session anonyme** (id en `localStorage`, `cdv_session`).

Mécanique d'une capsule : **vidéo (embed) → fiche HTML → exercice sauvegardé → feedback IA Claude → CTA DR**.
> Section commentaires/communauté **retirée** (jugée non pertinente, risque de défocus). Table `cdv.comments` laissée en base (inutilisée).

---

## 🩺 PIVOT EVERGREEN — « Le Diagnostic Business » (audit d'entreprise) — EN COURS

**Contexte / vision** : transformer le dispositif ponctuel (été) en **lead magnet EVERGREEN** = un **audit/diagnostic** de l'entreprise du chef d'entreprise, dispo toute l'année. **Finalité = déclencher la prise de RDV** avec l'équipe qui close les programmes high-ticket (DR + coaching MM/3MD/3MP). Le diagnostic n'est pas une fin : c'est l'aimant + le **brief du closer** (double usage de la donnée : personnaliser le conseil ET armer le commercial).

**Différenciateur** : Max IA branché sur **toute la base de connaissance** (transcripts de formation + Q&R Max/coachs) via **RAG (Pinecone à réactiver)** → « la méthode de Max appliquée à VOS chiffres », non copiable.

**Parcours cible** : Pub/SEO → Landing → **Opt-in en porte d'entrée** (conversion pub tôt, contrainte Meta/Google) → **Diagnostic express** (~5 min) → **Résultats** (score, radar, coût de l'inaction) → **Approfondissements optionnels** (la valeur est délivrée DANS l'outil, jauge de fiabilité qui monte — pas un péage vers le call) → **Prise de RDV**. Cible : chef d'entreprise établi, tous secteurs ; leads quali = CA ≥ 100K.

### Questionnaire — V3 VALIDÉE PAR MAX EN L'ÉTAT (2026-08-26) ✅
- **8 blocs, 33 questions** (5 profil + **28 de diagnostic**), ~8-10 min. Structure alignée sur le rapport visé.
- Blocs : A Profil · B Votre entreprise · C Croissance & finances · D Acquisition & ventes · E Offre & clients · F Organisation · G Le chef d'entreprise · H Ambition & freins.
- Exigences Max intégrées : **« je ne sais pas »** sur les chiffres ; CA actuel en € ; objectifs CA 12 mois/3 ans (1 question, 2 champs) ; **dépenses marketing/mois** (CAC/ROAS) ; **part de CA des clients existants** (monétisation) ; **« quel facteur limite votre croissance ? »** (la question « ce que vous pensez vs ce qu'on trouve ») ; **« 90 jours si vous disparaissez »** ; **« équipe de direction sans vous »** ; **tableau de bord KPI** ; EBE + marge brute + rétention.
- Contenu figé dans `src/app/audit-questions-v3/ReviewClientV3.tsx` (const `SECTIONS`).

### Outil interne de relecture/validation (ISOLÉ — ne touche pas le SaaS)
- 3 pages : `/audit-questions` (V1) · `/audit-questions-v2` · `/audit-questions-v3`. Max **annote / réécrit / valide / commente directement** dessus (auto-enregistré, partagé par simple lien `*.netlify.app`, sans compte). `noindex`, non liées depuis le SaaS.
- **Table dédiée `cdv.audit_review`** (1 ligne par version : ids `questions`, `questions_v2`, `questions_v3`) + RPC `audit_review_get/save` + route `/api/audit-review`. Édits indexés par `si_qi`.
- ⚠️ **NE JAMAIS vider `cdv.audit_review`** (les annotations de Max/Vincent y vivent — les avoir effacées par des resets de test était la cause des « validations qui disparaissent »). Pour tester : id à part ou neutraliser le POST, jamais `delete`.
- UI : accordéon premium (tout replié au départ · auto-repli d'un bloc entièrement décidé · carte verte + badge « Validé ») ; statut **Validée (vert) / À revoir (rouge)** à droite ; **commentaire optionnel** (bouton « + Ajouter un commentaire »). **Palette & polices de Max** : navy #00194C, bleu #0046FF / #2563FF, gris #9096A5 / #555B6E, vert #0D9488, **Poppins (titres) + Inter (corps)**.
- Historique annotations : V1 = 49 · V2 = 34 (round-2 Max) · **V3 = validée en l'état**.

### RAPPORT de résultats — À CONSTRUIRE (Max : « le rapport compte plus que les questions »)
- En-tête : « Diagnostic de croissance de [Entreprise] » + **potentiel inexploité estimé +X à +Y €/an**.
- **4 scores seulement** : 🚀 Croissance · 💰 Rentabilité · 📈 Machine commerciale · ⚙️ Liberté du chef d'entreprise (Max a écrit « Liberté du dirigeant » → arbitrer wording).
- **3 plus gros leviers** chiffrés (ex. conversion 18→25 % = +270 K€/an ; monétisation clients ; dépendance dirigeant : heures × % opérationnel).
- **1 à 3 recommandations courtes** (en surface, PAS de deep-dive) ; **appuyer sur le manque à gagner**.
- **Règle d'or** : distinguer **manque à gagner MESURABLE** (calculé sur ses données) du **POTENTIEL d'amélioration** (benchmark, clairement présenté comme estimation). **JAMAIS de faux chiffre** (crédibilité auprès des bons entrepreneurs). Ton **mini due-diligence / board assessment**, pas quiz marketing.
- CTA : « Réserver mon Diagnostic Stratégique ».

### Règle wording (rappel)
« dirigeant » **banni** → « chef d'entreprise » / « vous ». Exception : là où Max l'a écrit précisément (ex. le libellé de score du rapport) → à arbitrer avec Vincent.

### Prochaines étapes
1. **Maquette du RAPPORT de résultats** (prioritaire — proposée à Vincent, en attente de go).
2. V3 validée → **implémenter le vrai produit evergreen** : décalendariser le SaaS, brancher le questionnaire V3, le scoring 4 axes, le coût de l'inaction mesurable/estimé, le RAG (base Max), la prise de RDV.
3. Maquettes visuelles existantes = artifacts claude.ai (privés) ; la version éditable de référence = les pages `/audit-questions-*`.

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
| `/admin` | Back-office (KPIs leads/sources/qualité/engagement + **visiteurs uniques/visites**) protégé par mot de passe |
| `POST /api/admin/overview` | Agrégats admin via `cdv.admin_overview(p_pass)` (bcrypt, security-definer) |
| `POST /api/visit` | Ping visiteur (entrée `/espace`) → `cdv.touch_session` (compteur type GA : unique = session, visite = +1 après 30 min) |

> Routes Momentum supprimées : sign-in/up, qualify, diagnostic, chat, dashboard, guide-*, bibliotheque, plan, api/session, api/chat, etc.

---

## 📁 Fichiers clés

- `src/data/capsules.json` — contenu des 9 capsules. **C1 complète** ; C2→C9 = métadonnées + fiche distillée + exercice (défi) + prompt feedback. À enrichir avec les vidéos au fil de l'été.
- `src/lib/types.ts` — `Capsule`, `ExerciceField`, `CapsuleProgress`, `Comment`.
- `src/lib/capsules.ts` — `getCapsules/getCapsule`, `isUnlocked(capsule,{preview})`, `formatDateFr`, `DR_URL`, `TOTAL_CAPSULES`.
- `src/lib/session.ts` — session anonyme + progression locale + sync serveur best-effort + mode preview.
- `src/lib/supabase.ts` — client serveur ; `null` si env absentes (→ bascule localStorage).
- `src/lib/providers/anthropic.ts` — cœur Max IA. **Modèle : `claude-opus-4-8`**, `max_tokens 1800`. Voir la section « 🤖 Max IA » plus bas pour l'architecture (cache, streaming, sécurité, etc.). NB : `generateExerciceFeedback`/`generatePlanFinal` ont été remplacés par `buildExerciceMessages`/`buildPlanMessages` (construisent system+user) + `streamCompletion`/`completeOnce`.
- `src/lib/cost.ts` — « taxe stupide » (coût de l'inaction). CA canonique unique + bornes par levier + signalement d'incohérence. Voir section « 🤖 Max IA ».
- `src/lib/coachKnowledge.ts` — `MAX_VOICE` (voix + règles de langage) + `COACH_KNOWLEDGE` (matière de Max par capsule, distillée des transcripts). **Pas de RAG** (jugé disproportionné ; à reconsidérer seulement si on passe en chat ouvert).
- Composants : `AppShell` (sidebar SaaS + drawer mobile + footer), `VideoEmbed` (YouTube/Vimeo/mp4), `ExerciceForm` (champs + % calculé + **champ « activité » conditionnel** + streaming + feedback en blocs, ou mode `plan` en C9), `CtaDR`, `Footer`, `SessionPing`, `OptInModal`, `CostOfInaction`, `UtmCapture`, `GtmScript`.

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

- Déblocage réel par date (`dateUnlock` dans capsules.json), **7 dates pour 9 capsules** (calendrier août 2026, cadence mardi/vendredi) : C1 **04/08** · C2 **07/08** · **C3+C4 11/08** · C5 **14/08** · **C6+C7 18/08** · C8 **21/08** · C9 **25/08**. (Les doubles = paires enchaînées dans les scripts.)
- Aujourd'hui (avant 04/08) tout est verrouillé en réel. **Mode démo** pour tester : `/espace?preview=1`
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
  - **`/api/optin`** (signup / qualify / login) → **DEUX canaux HubSpot à la qualif** (contact dédoublonné par email, jamais de doublon) : **(1) API CRM** (app privée, `HUBSPOT_TOKEN` secret) = mapping fin + **maj HYBRIDE** si existant (profil tél/CA/secteur **rafraîchi** avec la valeur fraîche ; prénom + attribution + date = **first-touch**, jamais écrasés) ; **(2) Forms API** (form `HUBSPOT_FORM_GUID`) = enregistre une **soumission** → compte dans les **stats du formulaire** + déclenche ses workflows. Sans token, le formulaire est l'unique canal. **Le tél est obligatoire** dans la modale. ⚠️ Régression corrigée 2026-06-17 : le passage à l'API CRM avait **coupé** l'appel au formulaire (plus de soumission depuis le 11/06) → les deux canaux sont de nouveau actifs. ✅ Testé bout-en-bout (création, mapping, hybride, anti-bidon, soumission formulaire).
  - **Mapping HubSpot** : prénom=`firstname`, tél=`phone` (normalisé **E.164**), CA=`chiffre_d_affaires_annuel_new`, secteur=`secteur_dactivite_summer_business` (le **\_summer\_business**, ≠ Max Piccinini), **gclid→`hs_google_click_id`**, **fbclid→`hs_facebook_click_id`**, **utm_source/medium/campaign concaténés→`source_summer_business`**, **date du 1er opt-in→`date_optin_summer_business`** (créée par l'app ; permet de filtrer les leads SB par source + date).
  - **Anti-bidon** (`src/lib/validation.ts`) : email syntaxe + blocage jetables/factices + **vérif MX** du domaine (serveur, fail-open) ; tél validé via **libphonenumber-js** (FR + intl). Inline dans la modale + contrôle serveur autoritaire.
  - Reste optionnel : envoi d'email (différé), page `/espace/[token]` (pas nécessaire, l'identité tient via localStorage + reconnexion email).
- [x] **Tracking GTM server-side** : conteneur **`GTM-MVH3FZ3`** chargé ; `dataLayer` → `page_view` + **`generate_lead`** segmenté `lead_quality` (**'quali' ≥100K = conversion optimisée** · 'classique' <100K), avec `event_id` de dédup. ✅ Testé : `generate_lead` ingéré par GTM (uniqueEventId). **Reste côté GTM SS (Vincent) : créer les 2 conversions filtrées sur `lead_quality` + brancher Meta CAPI / Google Ads.**
  - Quali = 4 tranches ≥100K (`100K–999K`, `300K–1M`, `1M–10M`, `+10M`). Voir `src/lib/optin.ts` (`caLeadQuality`).

### Phase 3
- [x] Synthèse finale : intégrée **dans la C9** (pas une page séparée). `/api/plan` + `generatePlanFinal` compilent tout le cahier (C1→C9) ; `ExerciceForm` mode `plan` sauve les derniers champs puis génère, plan persisté en localStorage (`cdv_plan_*`).
- [x] Coquille SaaS : `AppShell` (sidebar gauche desktop = nav 9 leviers + états + progression + démo + CTA DR, drawer mobile) + `Footer` partagé, responsive.
- [x] **Back-office `/admin`** — protégé par mot de passe (bcrypt en base, fonction security-definer `cdv.admin_overview`, aucune env var à ajouter). KPIs : leads total + **quali/classique**, opt-ins/jour, **par source/secteur/CA**, **entonnoir 9 étapes** (vidéos vues vs exercices), activation, plan C9, table des inscrits. **Mot de passe : stocké en local dans `.env.local` (non publié), jamais dans un fichier committé.** Pour le changer : `update cdv.admin_config set value = crypt('NOUVEAU', gen_salt('bf')) where key='password';`.
- [ ] Tracking (opt-in, progression, clics CTA DR → HubSpot / Hyros).

---

## 📚 Docs source

`_cahier-vacances-docs/` (hors repo) : `Capsules-DR26-Plan-Detaille.md`, `SaaS-Cahier-Vacances-DR26-Spec.md`,
`Structure-Capsules-Ete-DR26.md`, `C1-contenu.md` (contenu C1 intégré).
Retours de Max (PDF + mémo vocal) : déposés en local, **gitignorés** (`*.pdf`). Ne jamais committer.

---

## 🤖 Max IA — architecture, règles & cost engine (à jour 2026-06-15)

**Tous les retours de Max (PDF + mémo vocal du 15/06) ont été appliqués et validés en prod.**

### Architecture du prompt (`src/lib/providers/anthropic.ts`)
- **Frontière de cache** (prompt caching Anthropic) : SEUL le bloc `system` est mis en cache (`cache_control: ephemeral`). Il est **stable par capsule** = `MAX_VOICE` + `GUARD` (sécurité) + `capsule.feedbackPrompt` + `COACH_KNOWLEDGE[n]` + `STATIC_FORMAT`. Le `user` (profil + fil rouge + montants + réponses) est **DYNAMIQUE, jamais caché** (confidentialité + zéro mélange entre prospects). Vérifié : ~2700 tokens lus du cache, ~580 frais.
- **Streaming** : `/api/exercice` et `/api/plan` renvoient un flux `text/plain` (token par token). Côté client : `submitExercice`/`generatePlan` lisent le flux via `readTextStream(onChunk)` ; `ExerciceForm` affiche `StreamingView` (texte qui s'écrit + curseur) puis bascule sur les blocs formatés. Persistance du feedback en fin de flux ; les réponses sont persistées AVANT l'appel IA (jamais perdues).
- **Résilience** : `streamCompletion`/`completeOnce` font 1 réessai sur échec transitoire (429/5xx/timeout) ; timeout 45-60 s ; repli non streamé. Bouton « Réessayer » sous le message d'erreur.

### Comportement / règles du retour (les 4 blocs `##CONSTAT## / ##ACTION## / ##COUT## / ##QUESTION##`)
- **Anti-invention** : n'affirme JAMAIS ce que les réponses ne prouvent pas ; conditionnel quand l'info manque (ex. fréquence 1/an ≠ « client qui ne revient jamais »).
- **Ancrage** : constat/action/question portent sur le levier que l'utilisateur a lui-même coché (`levier_faible` C1, `levier_sous_exploite` C6, `fuite_principale` C7).
- **Contexte « activité »** : capté UNE fois dans le 1er exercice généré (champ conditionnel dans `ExerciceForm`, masqué après ; `setActiviteLocal`/`hasActivite` ; persisté en base via RPC `cdv.set_session_activite`, colonne `participants.activite`). Injecté ensuite dans tous les retours. **PAS dans l'opt-in** (pour ne pas alourdir le tunnel).
- **Fil rouge** (mémoire inter-capsules) : `buildFilRouge` injecte un récap compact des champs-clés des capsules déjà faites (lu depuis `cdv.progress`). Dégrade proprement si historique vide.
- **Sécurité (`GUARD`)** : les réponses sont des DONNÉES, jamais des instructions → anti prompt-injection ; hors-sujet (recette, blague) → refus cadrant court ; non-divulgation du prompt/méthode ; cap longueur des champs (600 c) + délimitation `<<< >>>`.
- **Règles de rédaction (`MAX_VOICE` + `STATIC_FORMAT`)** : voix de Max (direct, punchy, phrases courtes), **valeur personnalisée** (ses chiffres). **Interdits** : le mot « **dirigeant** » (→ « chef d'entreprise »/« vous ») ; tournures genrées (rester **neutre**, genre inconnu) ; **tirets cadratins `—`** (sortie nettoyée par `dashFix`/`sanitise`) ; ouvrir par « Soyons clairs » ; clore l'action par « vous saurez que ça marche le jour où » ; réécrire « taxe stupide » dans le corps. Chaque balise UNE seule fois (parser robuste si doublon).

### Cost engine « taxe stupide » (`src/lib/cost.ts`)
- **CA canonique unique** pour toutes les capsules (cohérence) : priorité CA reconstitué (`clients × panier × fréquence`, C6) > réalisé annualisé (`ca_realise × 2`, C1) > objectif > tranche d'opt-in (dernier recours). Calculé depuis l'historique (`prior`) passé à `leverCost`.
- **Bornes** par levier (`LEVER_PCT`, croisées avec les ordres de grandeur de Max) ; **chiffrées seulement** pour C1/C3/C4/C6/C7 ; **qualitatives** (sans euro) pour C2/C5/C8. Montants ronds (`roundClean`). Taxe C1 capée sur l'écart à l'objectif.
- **Signalement d'incohérence** : si réalisé annualisé vs reconstitué divergent de **> 15 %** (capsule 6 seulement), Max IA le relève en **1 phrase simple, directe, NEUTRE**, **les deux chiffres sourcés** (ex. « vos ventes (300k à mi-année, doublées) donnent 600k, vos clients (8000×25×4) donnent 800k. Je pars sur 800k »), sans jugement, dans le bloc COUT. (Résidu connu et accepté : le plan C9 ne reprend pas cette base reconstituée ; cas marginal.)

### Préférences de Vincent (à respecter sur Max IA)
Retours dans le **ton de Max**, **compréhensibles**, **clairs/simples**, **PAS sur-rédigés** (pas de tournures littéraires/alambiquées), avec **valeur perso**. Montants **data-driven, crédibles, ronds, jamais au pif**. Vincent a un AUTRE Claude éduqué au ton de Max pour la réécriture des scripts ; ici on construit et on donne des retours, on ne sur-réécrit pas à sa place.

---

## 🧪 Méthode de test (validée cette session)
Batterie de personas (6 profils variés : CA/secteur/modèle différents, dont secteur « Autre » et débutant) qui font le **parcours complet 9 capsules** via l'API (script Python qui lit le flux), + relecture par **sous-agents** (cohérence ET rédaction). **Toujours nettoyer** les données de test après (`delete from cdv.progress/participants/sessions where session_id like 'TEST%'`).

## 🗄️ DB `cdv` — tables & RPC (état actuel)
Tables : `participants` (+ colonne **`activite`**), `progress`, **`sessions`** (visiteurs, type GA), `comments` (inutilisée), `admin_config`. RPC security-definer : `find_participant`, `set_participant_qualif` (6 args), **`set_session_activite`**, **`touch_session`**, `admin_overview` (+ bloc `visitors`), `admin_participant_detail` (+ `activite`), `scored_participants`. Miroir dans `supabase/schema.sql`. Migrations appliquées directement via le MCP Supabase (projet `rqjuyyhwzznaihqtalod`).

## 🚀 Déploiement
Push sur `main` → **Netlify auto-déploie** (site `1d019bf1-7cf6-41ad-98b9-a08d0b1f8410`, domaine `summer-business.maxpiccinini.com`). Build ~30-45 s. Vérifier l'état via le MCP Netlify (`get-project` → `currentDeploy.state: ready`). **Les migrations DB sont déjà en prod** (Supabase partagé). `HUBSPOT_TOKEN` secret : jamais committer. Env vars : **UI Netlify uniquement** (le MCP n'écrit pas).

## 🆘 Support, relance DR & webhooks Camille (ajoutés 2026-07-24)
- **Incidents** (`cdv.incidents` + RPC `log_incident` / `admin_incidents`) : les **échecs de génération Max IA sont captés AUTOMATIQUEMENT** (stream ET repli en échec) dans `/api/exercice` et `/api/plan`. La plupart des gens ne signalent rien, ils partent : on ne dépend donc pas de leur signalement. Visible dans `/admin` (section « Incidents »).
- **`HelpPanel`** (bouton flottant « Besoin d'aide ? » monté dans `AppShell`) : 5 réponses **écrites à l'avance, sans IA** (coût nul, réponse immédiate, zéro hallucination, et **pas de 3ᵉ voix** face à Max IA et Camille) + formulaire « Toujours bloqué ? » → `POST /api/report` → base + **Slack** (`SLACK_HELP_WEBHOOK_URL`). Sans l'URL Slack, l'incident est quand même enregistré. Plafond **5 signalements/h/IP** (`cdv.report_gate`). Décision : **pas de chat IA ni de chat live** (doublon avec Camille + coût + promesse de dispo intenable).
- **`DrPopup`** : relance Destination Réussite **une seule fois**, déclencheur **comportemental = 3 exercices terminés** (exactement la définition de « lead chaud » partagée avec l'équipe → une seule notion de chaud sur site/email/WhatsApp). Jamais bloquante, jamais affichée aux « je n'ai pas d'entreprise » (même exclusion que Camille). `session.ts` émet `cdv:progress` à chaque écriture pour déclencher au bon moment.
- **Webhooks Setteo** (`src/lib/setteo.ts`) : `optin` (crée le contact via /api/optin), `c1`→`c9` (**« capsule ok » = exercice soumis**), `plan` (déclenché **en fin de génération**). **Garantie opt-in-avant-tag (exigence Mathis, `sendTagWithOptin`)** : un tag seul ne crée pas le contact chez Setteo → avant chaque tag on vérifie `participants.setteo_optin_ok` ; si l'opt-in n'a pas encore réussi (1er webhook tombé), on le **renvoie avant le tag** puis on marque le flag (RPC `set_setteo_optin_ok`). **Zéro re-spam** : dès que l'opt-in a réussi une fois, il n'est plus renvoyé. Format Mathis : POST JSON, **téléphone international sans `+`**, `variables` à **clés explicites** (`c2_priorite_une`…). `last_name` vide. Exclusion des leads **sans entreprise** et **sans téléphone**. 1 réessai, échec définitif tracé en incident. Config = **une variable d'env par événement** (`SETTEO_URL_OPTIN`, `SETTEO_URL_C1`…`C9`, `SETTEO_URL_PLAN`), format .env natif, à poser dans l'UI Netlify (repli sur `SETTEO_WEBHOOKS` JSON supporté).

## 📋 Reste à faire (au 2026-07-24)
- [x] **Vidéos C1→C9** : les 9 embeds Vimeo (vidéos privées, hash `?h=` géré dans `VideoEmbed`) sont posés dans `capsules.json`. Vérifié : lecteur qui charge (pas d'erreur « vidéo privée »).
- [ ] **Fiches C2→C9** : enrichir si besoin depuis les transcripts.
- [x] **Env Netlify — posées** (2026-08-02) : les 11 webhooks Setteo (`SETTEO_URL_OPTIN`, `SETTEO_URL_C1`…`C9`, `SETTEO_URL_PLAN`) **+ `OPENAI_API_KEY`**. **Setteo VÉRIFIÉ live** (panel de test 2026-08-02 : opt-in + 9 tags + plan = 11× HTTP 200 depuis la prod, `setteo_optin_ok=true`, Mathis a confirmé la remontée). OpenAI non re-testé en prod cette session (0 bascule loggée = Anthropic n'est jamais tombé ; preuve live = forcer un repli). NB : les env ne sont **pas lisibles via le MCP Netlify**, on vérifie par le comportement.
  - [x] **`SLACK_HELP_WEBHOOK_URL` posé + VÉRIFIÉ live** (2026-08-04) : Incoming Webhook Slack vers **#tam-machine** (`C0A2J8SN9T5`). Testé en prod : `/api/report` → notif « 🆘 Nouveau signalement » bien reçue dans le canal. (Webhook aussi dans `.env.local`, gitignoré.)
- **Backup IA OpenAI** (`src/lib/providers/openai.ts`) : Claude reste **primaire** (stream → réessai → repli non streamé). Si Anthropic est **totalement KO**, bascule sur **OpenAI** (`gpt-4o` par défaut, `OPENAI_MODEL` surchargeable) avec le **même prompt** (system+user) → « quasi-Max ». Non streamé (route renvoie `{feedbackIA}`/`{plan}`, le client sait lire). Chaque bascule est **loggée en incident** (`fallback: openai`) → visible dans `/admin` = on voit quand Anthropic tombe. Branché sur `/api/exercice` et `/api/plan`. Testé de bout en bout (clé Anthropic invalidée → bascule OpenAI OK, 4 blocs + vouvoiement respectés).
- [x] **Mode démo retiré** (2026-08-02) : interrupteur global `DEMO_ENABLED = false` dans `src/lib/session.ts`. Aucun visiteur ne peut le voir (bouton masqué dans `AppShell`) ni l'activer (`?preview=1` et le toggle sont neutralisés, le localStorage `cdv_preview` est ignoré). Le drip réel par date s'applique à tous. **Pour rouvrir la démo :** repasser `DEMO_ENABLED` à `true` (la logique est intacte). Vérifié en local : 9 cadenas, accès direct capsule bloqué, 0 erreur console.
- [ ] **Logos médias** « Vu sur » : à valider visuellement par Vincent.
- [ ] Optionnel : mot de passe admin à changer.
