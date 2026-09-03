-- Saathi chat thread migration
-- Adds a `feature` column to chat_history so each thread stores its own
-- conversation history independently (general / disease / crop / marketplace).
-- Run against your Supabase project after 0001_init_schema.sql.

alter table public.chat_history
  add column if not exists feature text
    not null default 'general'
    check (feature in ('general', 'disease', 'crop', 'marketplace'));

-- Composite index for per-user, per-feature ordered queries
create index if not exists chat_history_user_feature_idx
  on public.chat_history (user_id, feature, created_at);
