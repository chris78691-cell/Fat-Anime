-- ============================================================
-- FAT ANIME — anime-only requests (AniList-backed).
-- Run ONCE in the Supabase SQL editor. Idempotent + safe to re-run.
-- This REPLACES the old free-text requests with a curated, dedup-by-id system.
-- ============================================================

-- trigram fuzzy matching (misspelling safety net)
create extension if not exists pg_trgm;

-- ---- Catalog: ~top 3000 anime, pre-loaded from AniList ----
-- Refresh anytime with: node tools/load-anime.cjs  (needs Supabase env vars)
create table if not exists anime (
  anilist_id  integer primary key,
  english     text,
  romaji      text,
  native      text,
  synonyms    text[] not null default '{}',
  popularity  integer not null default 0,
  search_blob text not null default ''   -- lowercased english+romaji+native+synonyms, for matching
);
create index if not exists anime_search_trgm on anime using gin (search_blob gin_trgm_ops);
create index if not exists anime_popularity   on anime (popularity desc);

-- ---- Leaderboard: one row per requested anime (dedup by AniList id) ----
create table if not exists anime_requests (
  anilist_id integer primary key references anime (anilist_id) on delete cascade,
  votes      integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---- One vote per visitor per anime ----
create table if not exists anime_request_votes (
  anilist_id integer not null references anime (anilist_id) on delete cascade,
  voter      text not null,
  primary key (anilist_id, voter)
);

-- ---- Per-visitor daily submission rate limit (reused if it already exists) ----
create table if not exists request_submissions (
  day text not null,
  user_id text not null,
  count integer not null default 0,
  primary key (day, user_id)
);

alter table anime               enable row level security;
alter table anime_requests      enable row level security;
alter table anime_request_votes enable row level security;
alter table request_submissions enable row level security;

-- ------------------------------------------------------------
-- Autocomplete: substring match across titles + synonyms, popular first.
-- ------------------------------------------------------------
create or replace function search_anime(q text, lim integer default 8)
returns table (anilist_id integer, english text, romaji text)
language sql stable security definer as $$
  select a.anilist_id, a.english, a.romaji
  from anime a
  where a.search_blob ilike '%' || lower(q) || '%'
  order by a.popularity desc
  limit greatest(1, least(lim, 25));
$$;

-- ------------------------------------------------------------
-- Resolve free text to ONE canonical anime: exact substring first,
-- else the closest by trigram similarity (misspelling safety net).
-- ------------------------------------------------------------
create or replace function resolve_anime(q text)
returns integer
language plpgsql stable security definer as $$
declare r integer;
begin
  select anilist_id into r from anime
   where search_blob ilike '%' || lower(q) || '%'
   order by popularity desc limit 1;
  if r is not null then return r; end if;

  select anilist_id into r from anime
   order by similarity(search_blob, lower(q)) desc limit 1;
  return r;
end; $$;

-- ------------------------------------------------------------
-- Submit from the box: rate-limit (p_max/day), add to board, cast vote.
-- Returns {"votes": n, "voted": true} or {"error": "limit"}. Race-safe.
-- ------------------------------------------------------------
create or replace function submit_anime(p_anilist integer, p_voter text, p_day text, p_max integer)
returns json
language plpgsql security definer as $$
declare cnt integer; v integer;
begin
  insert into request_submissions (day, user_id, count) values (p_day, p_voter, 0)
    on conflict (day, user_id) do nothing;
  update request_submissions set count = count + 1
   where day = p_day and user_id = p_voter and count < p_max
  returning count into cnt;
  if cnt is null then return json_build_object('error','limit'); end if;

  insert into anime_requests (anilist_id, votes) values (p_anilist, 0)
    on conflict (anilist_id) do nothing;

  insert into anime_request_votes (anilist_id, voter) values (p_anilist, p_voter)
    on conflict (anilist_id, voter) do nothing;
  if found then
    update anime_requests set votes = votes + 1 where anilist_id = p_anilist;
  end if;

  select votes into v from anime_requests where anilist_id = p_anilist;
  return json_build_object('votes', v, 'anilist_id', p_anilist, 'voted', true);
end; $$;

-- ------------------------------------------------------------
-- Toggle a vote on a leaderboard entry (1 per visitor per anime).
-- Returns {"votes": n, "voted": bool} or {"error": "gone"}.
-- ------------------------------------------------------------
create or replace function toggle_anime_vote(p_anilist integer, p_voter text)
returns json
language plpgsql security definer as $$
declare v integer; now_voted boolean;
begin
  delete from anime_request_votes where anilist_id = p_anilist and voter = p_voter;
  if found then
    now_voted := false;
    update anime_requests set votes = greatest(votes - 1, 0) where anilist_id = p_anilist returning votes into v;
  else
    insert into anime_request_votes (anilist_id, voter) values (p_anilist, p_voter)
      on conflict (anilist_id, voter) do nothing;
    now_voted := true;
    update anime_requests set votes = votes + 1 where anilist_id = p_anilist returning votes into v;
  end if;
  if v is null then return json_build_object('error','gone'); end if;
  return json_build_object('votes', v, 'voted', now_voted);
end; $$;

-- ------------------------------------------------------------
-- Wipe the OLD free-text requests (replaced by the anime-only system).
-- Guarded so it's safe whether or not those tables exist.
-- ------------------------------------------------------------
do $$ begin
  if to_regclass('public.request_votes') is not null then delete from request_votes; end if;
  if to_regclass('public.requests')      is not null then delete from requests;      end if;
end $$;

-- (Optional cleanup — uncomment to drop the now-unused old tables/functions:)
-- drop function if exists toggle_vote(uuid, text);
-- drop function if exists cast_vote(uuid, text);
-- drop table if exists request_votes;
-- drop table if exists requests;
