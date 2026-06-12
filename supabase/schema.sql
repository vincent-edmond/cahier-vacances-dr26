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

-- Participant identifié (opt-in) : mémoire durable rattachée à l'email.
-- `session_id` = clé canonique vers cdv.progress (on relie le cahier anonyme
-- déjà commencé). Permet la reconnexion par email sur un autre appareil.
create table if not exists cdv.participants (
  token        text        primary key,
  email        text        not null unique,
  prenom       text,
  phone        text,
  ca           text,        -- tranche CA (chiffre_d_affaires_annuel_new)
  secteur      text,        -- secteur_dactivite_summer_business
  lead_quality text,        -- 'quali' (>=100K) | 'classique' (<100K)
  session_id   text,        -- session anonyme rattachée → progression
  attribution  jsonb,       -- utm_*, gclid, fbclid (first-touch)
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);
create index if not exists cdv_participants_email_lower_idx on cdv.participants (lower(email));

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table cdv.progress enable row level security;
alter table cdv.comments enable row level security;
alter table cdv.participants enable row level security;

-- participants : insert/update ouverts (usage anonyme), mais PAS de SELECT large
-- → on ne peut pas dumper les emails via la clé anon. La reconnexion passe par la
-- fonction security-definer cdv.find_participant (ne renvoie qu'une ligne).
create policy "participants_insert" on cdv.participants for insert to anon, authenticated with check (true);
create policy "participants_update" on cdv.participants for update to anon, authenticated using (true) with check (true);

create policy "progress_select" on cdv.progress for select to anon, authenticated using (true);
create policy "progress_insert" on cdv.progress for insert to anon, authenticated with check (true);
create policy "progress_update" on cdv.progress for update to anon, authenticated using (true) with check (true);

create policy "comments_select_approved" on cdv.comments for select to anon, authenticated using (status = 'approved');
create policy "comments_insert" on cdv.comments for insert to anon, authenticated with check (true);

-- ─── Accès Data API (schéma non public → grants explicites) ──────────────────
grant usage on schema cdv to anon, authenticated, service_role;
grant select, insert, update on cdv.progress to anon, authenticated;
grant select, insert on cdv.comments to anon, authenticated;
-- SELECT accordé pour le privilège-colonne requis par UPDATE ... WHERE email = … ;
-- aucune policy RLS de SELECT n'existe → un SELECT direct renvoie 0 ligne (emails
-- non dumpables via la clé anon). La reconnexion passe par cdv.find_participant.
grant select, insert, update on cdv.participants to anon, authenticated;
grant all on cdv.progress, cdv.comments, cdv.participants to service_role;

-- Reconnexion par email (security definer : n'expose qu'une ligne).
create or replace function cdv.find_participant(p_email text)
returns table(token text, prenom text, session_id text)
language sql security definer set search_path = cdv
as $$
  select p.token, p.prenom, p.session_id
  from cdv.participants p
  where lower(p.email) = lower(p_email)
  limit 1;
$$;
grant execute on function cdv.find_participant(text) to anon, authenticated;

-- Qualif via security-definer : un UPDATE direct serait filtré à 0 ligne faute de
-- policy SELECT (choix volontaire). La fonction bypasse RLS proprement.
create or replace function cdv.set_participant_qualif(
  p_email text, p_ca text, p_secteur text, p_phone text, p_lead_quality text
) returns void
language sql security definer set search_path = cdv
as $$
  update cdv.participants
     set ca = p_ca, secteur = p_secteur, phone = p_phone,
         lead_quality = p_lead_quality, updated_at = now()
   where lower(email) = lower(p_email);
$$;
grant execute on function cdv.set_participant_qualif(text,text,text,text,text) to anon, authenticated;

-- ─── Suivi des visiteurs du SaaS (entrée /espace) — sémantique Google Analytics ─
-- visiteur unique = 1 ligne (1 session navigateur, revenir n'en recrée pas),
-- visite = +1 après 30 min d'inactivité. Aucune PII ; écriture via security-definer.
create table if not exists cdv.sessions (
  session_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  visits     integer     not null default 1,
  source     text
);
alter table cdv.sessions enable row level security;
-- Pas de policy anon : ni lisible ni modifiable via la clé anon (accès par RPC only).
grant usage on schema cdv to anon, authenticated;
grant all on cdv.sessions to service_role;

create or replace function cdv.touch_session(p_session_id text, p_source text default null)
returns void
language plpgsql security definer set search_path = cdv
as $$
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    return;
  end if;
  insert into cdv.sessions (session_id, source)
  values (p_session_id, nullif(p_source, ''))
  on conflict (session_id) do update
    set last_seen = now(),
        visits = cdv.sessions.visits
                 + case when now() - cdv.sessions.last_seen > interval '30 minutes' then 1 else 0 end,
        source = coalesce(cdv.sessions.source, excluded.source);
end;
$$;
grant execute on function cdv.touch_session(text, text) to anon, authenticated;

-- ─── Exposer le schéma `cdv` à PostgREST (additif, garde public + graphql) ────
-- À exécuter hors migration (alter role + reload de la config) :
--   alter role authenticator set pgrst.db_schemas to 'public, graphql_public, cdv';
--   notify pgrst, 'reload config';
--   notify pgrst, 'reload schema';
