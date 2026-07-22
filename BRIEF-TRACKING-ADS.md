# Brief tracking — Summer Business · Conversions Google Ads & Meta Ads

> Document de cadrage pour le setup des conversions publicitaires.
> Destiné à l'expert tracking. Tout ce qui est listé est **déjà en place côté code** ;
> il reste à configurer les **tags/conversions dans GTM, Google Ads et Meta**.

---

## 0. Accès au SaaS pour tester

- **URL de production :** https://summer-business.maxpiccinini.com
- **Espace membre (le tunnel) :** https://summer-business.maxpiccinini.com/espace

⚠️ **Important pour tester maintenant :** le contenu se débloque par dates (1 capsule / jeudi à partir du 02/07/2026). Pour tout débloquer et pouvoir atteindre l'exercice + l'opt-in **dès aujourd'hui**, utiliser le **mode démo** :

> **https://summer-business.maxpiccinini.com/espace?preview=1**

(le mode démo reste actif via `localStorage` ; `?preview=0` pour l'annuler.)

---

## 1. À comprendre avant tout : l'opt-in est *décalé*

Le SaaS n'a **pas** de formulaire sur une page dédiée, ni de page « merci ». L'opt-in (création de compte) se déclenche **au moment où le visiteur demande son premier retour de « Max IA »**, après avoir consommé du contenu — **pas** sur la landing, **pas** à l'arrivée.

**Conséquences directes :**

- ❌ **Aucune conversion basée sur une URL** (pas de page de confirmation, pas de pageview de remerciement). Une conversion déclenchée sur une URL ne fonctionnera **jamais**.
- ✅ **La conversion est un ÉVÉNEMENT `dataLayer` : `generate_lead`.** C'est l'unique signal de conversion.
- ⏱️ **Décalage temporel possible** entre le clic pub et la conversion (le visiteur peut convertir plus tard, autre session/jour). On **persiste donc `gclid` / `fbclid`** (localStorage, *last-touch*) et on les **rattache au lead au moment de l'opt-in** → l'attribution fiable passe par **gclid/fbclid + matching server-side**, pas par le timing cookie du pixel.
- 🔂 `generate_lead` est poussé **une seule fois par lead** (à la qualification). Une reconnexion par email ou un lead déjà connu **ne re-déclenche pas** l'événement → pas de double comptage.

---

## 2. Conteneur & architecture cible

- **Conteneur GTM (web) : `GTM-MVH3FZ3`** — chargé sur tout le site.
- Architecture prévue : **GTM web → GTM Server-Side → fan-out Meta CAPI + Google Ads** (server-side), **déduplication via `event_id`**.
- Variable optionnelle `NEXT_PUBLIC_GTM_URL` = domaine first-party servi par le conteneur Server-Side (meilleure résilience face aux ad-blockers).

---

## 3. Les événements `dataLayer` poussés par le site (schéma exact)

### `page_view` (à chaque changement de route — le site est une SPA)
```js
{
  event: "page_view",
  page_path: "/espace/capsule/3"
}
```

### `generate_lead` — **LA CONVERSION** (poussé à la fin de l'opt-in en 2 étapes)
```js
{
  event:        "generate_lead",
  event_id:     "<uuid>",            // ← clé de DÉDUP (→ transaction_id Google / eventID Meta)
  lead_quality: "quali" | "classique",
  currency:     "EUR",
  email:        "<email BRUT>",      // ← à HASHER (SHA-256) côté GTM SS avant tout envoi
  prenom:       "<prénom>",
  phone:        "<E.164, ex +33612345678>", // ← à HASHER (enhanced/advanced matching)
  ca_bracket:   "<tranche de CA, ex '300 000€ à 1 million €'>",
  secteur:      "<secteur, ex 'BTP'>",
  gclid:        "<google click id>",  // si présent
  fbclid:       "<facebook click id>", // si présent
  utm_source:   "...", utm_medium: "...", utm_campaign: "..."
}
```

**`lead_quality`** = segmentation métier :
- **`quali`** = CA **≥ 100K€** (tranches : 100K–1M, 300K–1M, 1M–10M, +10M) → **le segment à optimiser** (cible : chefs d'entreprise établis).
- **`classique`** = CA **< 100K€**.

---

## 4. Les DEUX conversions à créer (Lead + Lead Quali)

C'est faisable **sans aucune modif de code** : le champ `lead_quality` est présent sur **chaque** événement `generate_lead`. On crée donc **deux conversions branchées sur le même événement**, avec un filtre différent.

### ✅ Décision validée (à appliquer telle quelle)

- **Lead** = **TOUS les leads** (quali inclus).
- **Lead Quali** = **tous les leads à +100K€ de CA** (`lead_quality = quali`).

| Conversion | Déclencheur | Compte |
|---|---|---|
| **Lead** | `generate_lead` *(sans filtre)* | **tous** les opt-ins |
| **Lead Quali** | `generate_lead` **ET** `lead_quality = quali` | uniquement les **≥ 100K€** |

Un lead à +100K déclenche `generate_lead` **une fois** et compte donc dans **Lead** (volume total) **et** dans **Lead Quali** (premium) — les deux ne sont **pas** exclusifs, c'est voulu. → On optimise les campagnes sur **Lead Quali** (la valeur) tout en mesurant le volume **Lead**.

---

## 5. Google Ads

1. **Deux *conversion actions***, toutes deux déclenchées par l'événement **`generate_lead`** dans GTM SS :
   - **Lead** : déclencheur `generate_lead` (sans condition).
   - **Lead Quali** : déclencheur `generate_lead` **avec condition `lead_quality` = `quali`**.
2. Passer le **`gclid`** de l'événement + **`event_id`** comme **identifiant de transaction** (dédup / anti-doublon).
3. **Enhanced Conversions for Leads** : hacher `email` + `phone` (SHA-256) côté Server-Side.
4. **Optimisation** : cibler **Lead Quali** comme conversion principale (« Primary ») pour le bidding ; garder **Lead** en secondaire/observation pour le volume.

---

## 6. Meta (Facebook / Instagram) Ads

1. **Tag Meta CAPI** dans GTM SS, déclenché sur **`generate_lead`**, **event name = `Lead`**.
2. **`event_id`** → `eventID` (déduplication avec un éventuel Pixel navigateur).
3. **`fbclid`** → reconstruire `fbc` ; récupérer `fbp` si un Pixel est présent.
4. **Advanced Matching** : hacher `email` + `phone`.
5. **Lead Quali** : créer une **Conversion personnalisée** = événement `Lead` **filtré sur le paramètre `lead_quality = quali`**.
6. **Décision** : Pixel navigateur (via GTM web) **+** CAPI (via GTM SS) dédupliqués par `event_id`, **ou** CAPI seule. *(Aujourd'hui aucun Pixel navigateur n'est posé — à ajouter dans GTM si souhaité.)*

---

## 7. Déduplication (transversal)

Utiliser **`event_id`** comme clé de dédup **partout** : Meta `eventID`, Google `transaction_id`. Indispensable dès qu'un Pixel navigateur **et** la voie server-side (CAPI / Conversions API) coexistent.

---

## 8. Décisions à trancher / points ouverts

1. **Valeur de conversion** : aujourd'hui on envoie `currency: "EUR"` **mais pas de valeur monétaire**. Pour du *value-based bidding*, il faut une valeur par lead (ex. quali = X€, classique = Y€). → **Si besoin, l'équipe peut l'ajouter à l'événement `generate_lead` côté code rapidement.** À cadrer avec l'expert.
2. **Consent Mode v2 (Google)** + base légale CAPI : à câbler selon le bandeau cookies du site.
3. **Pixel Meta navigateur** : à poser ou non (cf. §6.6).

---

## 9. Procédure de test (pas à pas)

1. Ouvrir **https://summer-business.maxpiccinini.com/espace?preview=1** (débloque tout en mode démo).
2. Pour tester l'attribution, arriver avec des paramètres, ex. :
   `https://summer-business.maxpiccinini.com/espace?preview=1&utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=TESTGCLID123`
3. Ouvrir une capsule → remplir l'exercice → cliquer **« Obtenir le retour de Max IA »**.
4. La modale d'opt-in s'ouvre → **étape 1** (prénom + email) puis **étape 2** (CA + secteur + téléphone).
   - Pour tester **Lead Quali**, choisir un **CA ≥ 100K€**.
   - Utiliser un **email de test sur un domaine qui reçoit des emails** (ex. Gmail) — le domaine est vérifié (MX), un `@example.com` peut être refusé à l'inscription.
5. À la validation, l'événement **`generate_lead`** est poussé dans le `dataLayer` avec tous les champs du §3.
6. Vérifier avec : **Mode Aperçu GTM**, **Meta Events Manager → Test Events**, **Google Tag Assistant / diagnostics de conversion Google Ads**.
7. Contrôler la **dédup** (`event_id` identique navigateur ↔ server-side).

> ⚠️ Chaque test complet crée un **vrai contact HubSpot** + une **vraie soumission de formulaire** + un **vrai événement de conversion**. Utiliser des emails de test identifiables, rester en **mode Test/Preview** pour ne pas polluer les données de conversion live, et **supprimer les contacts de test** après.

---

## 10. Pièges à connaître

- **PII dans le `dataLayer`** : `email` / `phone` sont en clair → **hacher obligatoirement** (SHA-256) côté Server-Side avant tout envoi, et respecter le consentement.
- **Pas de trigger URL** pour la conversion (cf. §1) — uniquement l'événement `generate_lead`.
- **`gclid` / `fbclid` = last-touch persistant** : le dernier clic pub avant l'opt-in est crédité (le bon pour l'optimisation).
- **L'ID GTM est inliné au build** : changer l'ID GTM nécessite un **vrai rebuild** du site (pas un simple redéploiement à vide).
- **Conversion = 1 seule fois par lead** : reconnexion / lead déjà connu ne re-déclenchent pas `generate_lead`.

---

## Récapitulatif des valeurs utiles

| Élément | Valeur |
|---|---|
| URL prod | https://summer-business.maxpiccinini.com |
| Tunnel (test) | https://summer-business.maxpiccinini.com/espace?preview=1 |
| Conteneur GTM web | `GTM-MVH3FZ3` |
| Événement de conversion | `generate_lead` |
| Clé de dédup | `event_id` |
| Segment premium | `lead_quality = quali` (CA ≥ 100K€) |
| Devise | `EUR` (valeur monétaire : à définir) |
| Click-ids | `gclid` (Google) · `fbclid` (Meta) |
