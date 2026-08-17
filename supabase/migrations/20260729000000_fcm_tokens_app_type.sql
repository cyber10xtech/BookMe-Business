-- Adds app_type to fcm_tokens so the same table can serve both the
-- BookMe Business and BookMe Customer apps without ambiguity.
--
-- NOTE ON onConflict: the app code upserts on the existing UNIQUE
-- constraint on fcm_tokens.token (there is no unique/exclusion
-- constraint on (user_id, platform) in the schema this was audited
-- against, so onConflict: "user_id,platform" would fail with Postgres
-- error 42P10 on every call). This migration does NOT add a
-- (user_id, platform) unique constraint — see the implementation
-- report for why the code was changed instead of the schema.
--
-- Column is nullable: existing rows predate app_type and are left as
-- NULL rather than guessed at, since this migration can't know which
-- app wrote them.

ALTER TABLE fcm_tokens
ADD COLUMN IF NOT EXISTS app_type TEXT
CHECK (app_type IN ('customer', 'business'));

-- No new index added: the Customer app's migration history for this same
-- shared table (20260727020000_fcm_tokens_ios_platform.sql) shows
-- fcm_tokens_user_platform_idx (user_id, platform) already exists and
-- already covers user_id-only lookups via leftmost-prefix matching.
