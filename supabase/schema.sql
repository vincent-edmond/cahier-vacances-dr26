-- ───────────────────────────────────────────────────────────────────────────
-- Le Cahier de Vacances DR26 — schéma Supabase
--
-- DÉPLOYÉ : projet hôte `dietzone` (rqjuyyhwzznaihqtalod), dans un schéma dédié
-- `cdv` pour rester isolé des autres tables du projet. Pas de projet séparé
-- (évite le +10 $/mois de compute d'un projet supplémentaire sur le plan Pro).
--
-- L'app accède aux tables via la clé publishable (anon) ; les policies RLS
-- ci-dessous ouvrent juste ce qu'il faut pour un usage anonyme et public.
-- Le client supabase-js cible le schéma via { db: { schema: 'cdv' } }.
-- ───────────────────────────────────────────────────────────────────────────

create schema if not exists cdv;

-- Progression d'une session anonyme sur une capsule.
create table if not exists cdv.progress (
  session_id  text        not null,
  capsule_num int         not null,
  vu          boolean     not null default false,
  reponses    jsonb,
  feedback_ia text,
  done_at     timestamptz,
  updated_at  timestamptz not null default now(),
  primary key (session_id, capsule_num)
);

-- Commentaires mutualisés par capsule (communauté + social proof).
create table if not exists cdv.comments (
  id          uuid        primary key default gen_random_uuid(),
  capsule_num int         not null,
  session_id  text,
  prenom      text,
  texte       text        not null,
  status      text        not null default 'approved',
  created_at  timestamptz not null default now()
);

create index if not exists cdv_comments_capsule_idx on cdv.comments (capsule_num, created_at desc);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table cdv.progress enable row level security;
alter table cdv.comments enable row level security;

create policy "progress_select" on cdv.progress for select to anon, authenticated using (true);
create policy "progress_insert" on cdv.progress for insert to anon, authenticated with check (true);
create policy "progress_update" on cdv.progress for update to anon, authenticated using (true) with check (true);

create policy "comments_select_approved" on cdv.comments for select to anon, authenticated using (status = 'approved');
create policy "comments_insert" on cdv.comments for insert to anon, authenticated with check (true);

-- ─── Accès Data API (schéma non public → grants explicites) ──────────────────
grant usage on schema cdv to anon, authenticated, service_role;
grant select, insert, update on cdv.progress to anon, authenticated;
grant select, insert on cdv.comments to anon, authenticated;
grant all on cdv.progress, cdv.comments to service_role;

-- ─── Exposer le schéma `cdv` à PostgREST (additif, garde public + graphql) ────
-- À exécuter hors migration (alter role + reload de la config) :
--   alter role authenticator set pgrst.db_schemas to 'public, graphql_public, cdv';
--   notify pgrst, 'reload config';
--   notify pgrst, 'reload schema';
