-- Migration: pending_auth_deletions
--
-- PURPOSE
-- ───────
-- Ensures the pending_auth_deletions table exists with the structure required
-- by the delete-own-account Edge Function.
--
-- WHAT THE SCHEMA DOCUMENT SHOWS
-- ───────────────────────────────
-- The shared schema document lists pending_auth_deletions with these columns:
--   id, auth_user_id, email, first_failed_at, last_attempt_at,
--   attempts, last_error, resolved, resolved_at
-- and ONLY a PRIMARY KEY on id — no UNIQUE constraint on auth_user_id.
--
-- WHAT THIS MIGRATION DOES
-- ─────────────────────────
-- 1. Creates the table if it does not already exist (safe if it already does).
-- 2. Adds a UNIQUE constraint on auth_user_id if it does not already exist,
--    because the Edge Function uses INSERT ... ON CONFLICT (auth_user_id)
--    to upsert failure records. Without this constraint the upsert cannot
--    target auth_user_id.
-- 3. Disables RLS — only the service-role key (Edge Function) writes here.
--
-- IDEMPOTENT: safe to run multiple times against a database that already
-- has the table (CREATE TABLE IF NOT EXISTS + conditional constraint add).

CREATE TABLE IF NOT EXISTS public.pending_auth_deletions (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  auth_user_id     uuid        NOT NULL,
  email            text,
  first_failed_at  timestamptz NOT NULL DEFAULT now(),
  last_attempt_at  timestamptz NOT NULL DEFAULT now(),
  attempts         integer     NOT NULL DEFAULT 1,
  last_error       text,
  resolved         boolean     NOT NULL DEFAULT false,
  resolved_at      timestamptz,
  CONSTRAINT pending_auth_deletions_pkey PRIMARY KEY (id)
);

-- Add UNIQUE(auth_user_id) only if it does not already exist.
-- The Edge Function uses this constraint as the upsert conflict target.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class r ON r.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = r.relnamespace
    WHERE n.nspname = 'public'
      AND r.relname = 'pending_auth_deletions'
      AND c.contype = 'u'
      AND (
        SELECT array_agg(a.attname ORDER BY a.attname)
        FROM pg_attribute a
        WHERE a.attrelid = r.oid AND a.attnum = ANY(c.conkey)
      ) = ARRAY['auth_user_id']
  ) THEN
    ALTER TABLE public.pending_auth_deletions
      ADD CONSTRAINT pending_auth_deletions_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END $$;

-- No RLS: only the service-role key (Edge Function) reads/writes this table.
ALTER TABLE public.pending_auth_deletions DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.pending_auth_deletions IS
  'Records auth user deletions that the delete-own-account Edge Function could '
  'not complete (auth.admin.deleteUser() returned an error). An admin should '
  'periodically review resolved = false rows and retry them manually via the '
  'Supabase dashboard or by calling auth.admin.deleteUser() with the stored '
  'auth_user_id.';
