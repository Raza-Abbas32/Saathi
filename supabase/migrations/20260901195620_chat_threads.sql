/*
# Saathi — Chat Thread Feature Column

## What this does
Adds a `feature` column to the `chat_history` table so each conversation
thread (general, disease, crop, marketplace) stores its own independent
history. Also adds a composite index for efficient per-user, per-feature
queries ordered by time.

## Changes
- New column: `chat_history.feature` (text, not null, defaults to 'general')
- Check constraint: feature must be one of 'general', 'disease', 'crop', 'marketplace'
- New index: `chat_history_user_feature_idx` on (user_id, feature, created_at)

## Security
No security changes — RLS policies from the initial schema still apply.
*/

ALTER TABLE public.chat_history
  ADD COLUMN IF NOT EXISTS feature text
    NOT NULL DEFAULT 'general'
    CHECK (feature IN ('general', 'disease', 'crop', 'marketplace'));

CREATE INDEX IF NOT EXISTS chat_history_user_feature_idx
  ON public.chat_history (user_id, feature, created_at);
