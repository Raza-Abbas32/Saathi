/*
# Saathi — Initial Database Schema

## What this does
Creates all five tables the Saathi app needs, with Row Level Security (RLS)
so each user can only read and modify their own data. The only exception is
the marketplace — listings are publicly browsable (like a real marketplace)
but only the owner can edit or delete their own listings.

## Tables created
1. **profiles** — one row per signed-up user (display name, avatar). Auto-created via a trigger when a new auth user signs up.
2. **marketplace_listings** — produce listings posted by farmers (crop, quantity, price, location, farmer name, description).
3. **disease_analyses** — saved crop disease detection results per user.
4. **crop_recommendations** — saved crop recommendation results per user.
5. **chat_history** — AI assistant conversation history per user.

## Security
- RLS enabled on every table.
- profiles: user can SELECT / INSERT / UPDATE only their own row.
- marketplace_listings: SELECT is public (anyone can browse); INSERT / UPDATE / DELETE restricted to owner.
- disease_analyses, crop_recommendations, chat_history: full CRUD restricted to owner.

## Notes
- A trigger auto-creates a profile row whenever a new user signs up
  (works for both email/password and Google OAuth).
- Indexes added on frequently-queried columns.
- All user_id columns default to auth.uid() so inserts work even when
  the frontend omits the owner field.
*/

-- ============================================================
-- profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile"
  ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile"
  ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- marketplace_listings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  crop_name text not null,
  quantity text not null,
  price_per_unit text not null,
  location text not null,
  farmer_name text not null,
  description text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Public marketplace: anyone can browse listings
DROP POLICY IF EXISTS "select_all_listings" ON public.marketplace_listings;
CREATE POLICY "select_all_listings"
  ON public.marketplace_listings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_listing" ON public.marketplace_listings;
CREATE POLICY "insert_own_listing"
  ON public.marketplace_listings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_listing" ON public.marketplace_listings;
CREATE POLICY "update_own_listing"
  ON public.marketplace_listings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_listing" ON public.marketplace_listings;
CREATE POLICY "delete_own_listing"
  ON public.marketplace_listings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS marketplace_listings_created_at_idx
  ON public.marketplace_listings (created_at desc);

-- ============================================================
-- disease_analyses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.disease_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  disease_name text not null,
  confidence numeric,
  severity text,
  crop_type text,
  description text,
  treatment jsonb,
  prevention jsonb,
  created_at timestamptz not null default now()
);

ALTER TABLE public.disease_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_disease_analyses" ON public.disease_analyses;
CREATE POLICY "select_own_disease_analyses"
  ON public.disease_analyses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_disease_analyses" ON public.disease_analyses;
CREATE POLICY "insert_own_disease_analyses"
  ON public.disease_analyses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_disease_analyses" ON public.disease_analyses;
CREATE POLICY "update_own_disease_analyses"
  ON public.disease_analyses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_disease_analyses" ON public.disease_analyses;
CREATE POLICY "delete_own_disease_analyses"
  ON public.disease_analyses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- crop_recommendations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crop_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  soil text,
  region text,
  season text,
  water text,
  results jsonb,
  created_at timestamptz not null default now()
);

ALTER TABLE public.crop_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_crop_recommendations" ON public.crop_recommendations;
CREATE POLICY "select_own_crop_recommendations"
  ON public.crop_recommendations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_crop_recommendations" ON public.crop_recommendations;
CREATE POLICY "insert_own_crop_recommendations"
  ON public.crop_recommendations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_crop_recommendations" ON public.crop_recommendations;
CREATE POLICY "update_own_crop_recommendations"
  ON public.crop_recommendations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_crop_recommendations" ON public.crop_recommendations;
CREATE POLICY "delete_own_crop_recommendations"
  ON public.crop_recommendations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- chat_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'ai')),
  text text not null,
  created_at timestamptz not null default now()
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_chat_history" ON public.chat_history;
CREATE POLICY "select_own_chat_history"
  ON public.chat_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_chat_history" ON public.chat_history;
CREATE POLICY "insert_own_chat_history"
  ON public.chat_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_chat_history" ON public.chat_history;
CREATE POLICY "update_own_chat_history"
  ON public.chat_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_chat_history" ON public.chat_history;
CREATE POLICY "delete_own_chat_history"
  ON public.chat_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS chat_history_user_created_idx
  ON public.chat_history (user_id, created_at);
