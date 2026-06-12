-- ============================================================
-- FAT ANIME — Supabase schema. Run once in the SQL editor.
-- All access goes through the service key (serverless functions);
-- RLS is enabled with no policies so the anon key can touch nothing.
-- ============================================================

-- Global daily fattening slots, keyed by Europe/London date (YYYY-MM-DD)
create table if not exists daily_slots (
  day text primary key,
  remaining integer not null
);

-- Per-visitor daily usage
create table if not exists user_generations (
  day text not null,
  user_id text not null,
  count integer not null default 0,
  primary key (day, user_id)
);

-- "Notify me when slots open" capture
create table if not exists notify_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Requests board (used in Phase 3, created now to keep one migration)
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) <= 80),
  votes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists request_votes (
  request_id uuid not null references requests (id) on delete cascade,
  voter text not null,
  primary key (request_id, voter)
);

alter table daily_slots enable row level security;
alter table user_generations enable row level security;
alter table notify_emails enable row level security;
alter table requests enable row level security;
alter table request_votes enable row level security;

-- ------------------------------------------------------------
-- Atomically claim one global slot. Seeds the day row on first
-- call. Returns slots left after claiming, or -1 if sold out.
-- ------------------------------------------------------------
create or replace function take_slot(p_day text, p_limit integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_remaining integer;
begin
  insert into daily_slots (day, remaining) values (p_day, p_limit)
  on conflict (day) do nothing;

  update daily_slots
     set remaining = remaining - 1
   where day = p_day
     and remaining > 0
  returning remaining into new_remaining;

  if new_remaining is null then
    return -1;
  end if;
  return new_remaining;
end;
$$;

create or replace function refund_slot(p_day text, p_limit integer)
returns void
language sql
security definer
as $$
  update daily_slots
     set remaining = least(remaining + 1, p_limit)
   where day = p_day;
$$;

-- ------------------------------------------------------------
-- Per-user counter. Returns the new count, or -1 once the user
-- hit the cap.
-- ------------------------------------------------------------
create or replace function take_user_slot(p_day text, p_user text, p_max integer)
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into user_generations (day, user_id, count) values (p_day, p_user, 0)
  on conflict (day, user_id) do nothing;

  update user_generations
     set count = count + 1
   where day = p_day
     and user_id = p_user
     and count < p_max
  returning count into new_count;

  if new_count is null then
    return -1;
  end if;
  return new_count;
end;
$$;

create or replace function refund_user_slot(p_day text, p_user text)
returns void
language sql
security definer
as $$
  update user_generations
     set count = greatest(count - 1, 0)
   where day = p_day
     and user_id = p_user;
$$;
