-- Weather App — initial schema (Spec §3).
--
-- Apply order:
--   1. 0001_init.sql      (this file: tables, RLS, policies, signup trigger)
--   2. 0002_indexes.sql   (supporting indexes)
--
-- Apply via the Supabase SQL editor or `supabase db push`. RLS is enabled on
-- every user-owned table; access is keyed on auth.uid(). The signup trigger
-- provisions a profiles + preferences row for each new auth.users entry.
--
-- NOTE: This is a Supabase migration artifact. There is no live Supabase
-- project in this environment, so RLS enforcement and the auth.users trigger
-- can only be verified against a real project (runtime verification deferred).

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- preferences: per-user settings (canonical metric units)
-- ---------------------------------------------------------------------------
create table if not exists public.preferences (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  temp_unit   text not null default 'celsius' check (temp_unit in ('celsius', 'fahrenheit')),
  wind_unit   text not null default 'kmh'     check (wind_unit in ('kmh', 'mph')),
  time_format text not null default '24h'     check (time_format in ('12h', '24h')),
  theme       text not null default 'system'  check (theme in ('light', 'dark', 'system')),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- favorites: saved locations, user-ordered
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  latitude   double precision not null,
  longitude  double precision not null,
  country    text,
  admin1     text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, latitude, longitude)
);

-- ---------------------------------------------------------------------------
-- Row-Level Security: each row visible/mutable only by its owner.
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.preferences enable row level security;
alter table public.favorites   enable row level security;

-- profiles policies (keyed on id = auth.uid())
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_delete_own" on public.profiles
  for delete using (id = auth.uid());

-- preferences policies (keyed on user_id = auth.uid())
create policy "preferences_select_own" on public.preferences
  for select using (user_id = auth.uid());
create policy "preferences_insert_own" on public.preferences
  for insert with check (user_id = auth.uid());
create policy "preferences_update_own" on public.preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "preferences_delete_own" on public.preferences
  for delete using (user_id = auth.uid());

-- favorites policies (keyed on user_id = auth.uid())
create policy "favorites_select_own" on public.favorites
  for select using (user_id = auth.uid());
create policy "favorites_insert_own" on public.favorites
  for insert with check (user_id = auth.uid());
create policy "favorites_update_own" on public.favorites
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "favorites_delete_own" on public.favorites
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Signup trigger: provision profiles + default preferences for new users.
-- SECURITY DEFINER so the trigger can insert past RLS at user-creation time.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
