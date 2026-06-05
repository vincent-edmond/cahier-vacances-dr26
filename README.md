# Le Cahier de Vacances du Chef d'Entreprise (DR26)

Espace web boosté à l'IA : 9 capsules business qui se débloquent au fil de l'été
(le « contre-pied de l'été »). Par capsule : vidéo → fiche → exercice → retour IA
(Claude) → commentaires → CTA Destination Réussite.

Dupliqué et simplifié depuis MOMENTUM.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · Supabase · Claude (Anthropic) · Netlify.
**Pas d'auth** : accès ouvert, session anonyme (`localStorage`).

## Démarrer

```bash
npm install
npm run dev   # http://localhost:3000
```

Variables d'env : voir `.env.local.example`.
- `ANTHROPIC_API_KEY` — feedback IA des exercices (requis pour le retour de Max).
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — progression + commentaires mutualisés.
  Sans ces clés, l'app tourne en `localStorage` seul (commentaires locaux).

## Routes

| Route | Rôle |
|---|---|
| `/` | Landing (dark navy) |
| `/espace` | Hub : 9 modules, déblocage par date (drip) |
| `/espace/capsule/[num]` | Capsule : vidéo, fiche, exercice + feedback IA, commentaires, CTA DR |
| `/api/exercice` (POST) | Sauve l'exercice + feedback Claude |
| `/api/progression` (GET/POST) | Progression d'une session |
| `/api/comments` (GET/POST) | Commentaires d'une capsule |

## Mode démo (avant le drip réel)

Le drip est calé sur le calendrier réel (C1 = 30/06/2026 → C9 = 25/08).
Pour tout débloquer en dev/démo : `/espace?preview=1` (bouton « Démo » dans le hub).
`?preview=0` pour revenir au comportement réel.

## Contenu

Les 9 capsules sont dans `src/data/capsules.json`. C1 (« Le bilan de mi-année »)
est complète ; C2→C9 ont métadonnées + fiche + exercice (à enrichir avec les vidéos
au fil de l'été). Source : `_cahier-vacances-docs/` (hors repo).

## Base de données

Schéma prêt à appliquer : `supabase/schema.sql` (tables `progress`, `comments` + RLS).
