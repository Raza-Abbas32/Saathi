-- Saathi initial schema
-- Run this against your Supabase project (SQL editor or `supabase db push`).
-- Covers every table the app code already references:
--   profiles, marketplace_listings, disease_analyses,
--   crop_recommendations, chat_history
-- Every table has Row Level Security enabled so users can only
-- read/write their own data (Marketplace listings are the one
-- exception — those are publicly readable by design, like a
-- real marketplace, but only editable/deletable by their owner).

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
-- (covers both email/password and Google OAuth sign-ups).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- marketplace_listings
-- ============================================================
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop_name text not null,
  quantity text not null,
  price_per_unit text not null,
  location text not null,
  farmer_name text not null,
  description text,
  created_at timestamptz not null default now()
);

alter table public.marketplace_listings enable row level security;

-- Public marketplace: anyone (including signed-out visitors, if you
-- ever open browsing without auth) can view listings.
create policy "Anyone can view listings"
  on public.marketplace_listings for select
  using (true);

create policy "Users can insert own listings"
  on public.marketplace_listings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own listings"
  on public.marketplace_listings for update
  using (auth.uid() = user_id);

create policy "Users can delete own listings"
  on public.marketplace_listings for delete
  using (auth.uid() = user_id);

create index if not exists marketplace_listings_created_at_idx
  on public.marketplace_listings (created_at desc);

-- ============================================================
-- disease_analyses
-- ============================================================
create table if not exists public.disease_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  disease_name text not null,
  confidence numeric,
  severity text,
  crop_type text,
  description text,
  treatment jsonb,
  prevention jsonb,
  created_at timestamptz not null default now()
);

alter table public.disease_analyses enable row level security;

create policy "Users manage own disease analyses"
  on public.disease_analyses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- crop_recommendations
-- ============================================================
create table if not exists public.crop_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  soil text,
  region text,
  season text,
  water text,
  results jsonb,
  created_at timestamptz not null default now()
);

alter table public.crop_recommendations enable row level security;

create policy "Users manage own crop recommendations"
  on public.crop_recommendations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- chat_history
-- ============================================================
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'ai')),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_history enable row level security;

create policy "Users manage own chat history"
  on public.chat_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists chat_history_user_created_idx
  on public.chat_history (user_id, created_at);
