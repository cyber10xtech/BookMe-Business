-- Founding-business welcome promotion: first N businesses to register get
-- a free trial (no card, no payment) for a configurable number of days.
--
-- ARCHITECTURE NOTE: this project has no pre-existing subscription/trial
-- table (audited profiles/services/bookings/etc. — nothing billing-related
-- exists yet), so per the brief this introduces the minimal reusable
-- infrastructure rather than a one-off "is_promo" flag:
--   - promo_campaigns  : one row per promotion, with a configurable
--                        max_claims / trial_days — no redeploy needed to
--                        change the limit or duration, just an UPDATE.
--   - promo_claims     : append-only ledger, one row per business that
--                        claimed a campaign. Source of truth for "did this
--                        business ever claim this promo".
--   - profiles.promo_* : denormalized cache of the claim onto the business's
--                        own account record (fast reads, no join needed by
--                        the app, matches "store eligibility on the
--                        business/account record").
-- Modeling it as campaigns (not a single hardcoded promo) also means this
-- same mechanism can run future promotions without new tables.
--
-- CONCURRENCY: claim_new_business_promo() takes `SELECT ... FOR UPDATE` on
-- the campaign row before checking/incrementing claims_count, so concurrent
-- registrations serialize on that single row lock — the classic "ticket
-- counter" pattern. A CHECK constraint (claims_count <= max_claims) backs
-- this up at the schema level in case the function is ever bypassed.

-- ── Campaign table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  max_claims integer NOT NULL DEFAULT 300 CHECK (max_claims > 0),
  claims_count integer NOT NULL DEFAULT 0 CHECK (claims_count >= 0),
  trial_days integer NOT NULL DEFAULT 60 CHECK (trial_days > 0),
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT promo_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT promo_campaigns_slug_key UNIQUE (slug),
  CONSTRAINT promo_campaigns_claims_within_max CHECK (claims_count <= max_claims)
);

COMMENT ON TABLE public.promo_campaigns IS
  'Configurable promo campaigns (e.g. founding-business free trial). max_claims and trial_days can be changed with a plain UPDATE — no code deploy needed.';

-- ── Claims ledger ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  user_id uuid NOT NULL,
  slot_number integer NOT NULL CHECK (slot_number > 0),
  trial_start_at timestamp with time zone NOT NULL DEFAULT now(),
  trial_end_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT promo_claims_pkey PRIMARY KEY (id),
  CONSTRAINT promo_claims_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.promo_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT promo_claims_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT promo_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  -- A business can claim a given campaign only once.
  CONSTRAINT promo_claims_one_per_profile UNIQUE (campaign_id, profile_id),
  -- Slot numbers are the 1..N ticket a business was granted; no two
  -- businesses in the same campaign can hold the same slot.
  CONSTRAINT promo_claims_unique_slot UNIQUE (campaign_id, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_promo_claims_profile_id ON public.promo_claims (profile_id);
CREATE INDEX IF NOT EXISTS idx_promo_claims_user_id ON public.promo_claims (user_id);

COMMENT ON TABLE public.promo_claims IS
  'Append-only ledger: one row per business per campaign it claimed. Source of truth for eligibility/uniqueness; profiles.promo_* is a denormalized cache of this for fast reads.';

-- ── Denormalized cache on the business/account record ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS promo_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_campaign_slug text,
  ADD COLUMN IF NOT EXISTS promo_slot_number integer,
  ADD COLUMN IF NOT EXISTS promo_trial_start_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS promo_trial_end_at timestamp with time zone;

COMMENT ON COLUMN public.profiles.promo_claimed IS
  'True once this business has claimed a promo campaign. Persisted on the account record so it survives refresh/logout/reopen — never derived from client state.';
COMMENT ON COLUMN public.profiles.promo_trial_end_at IS
  'When the granted promo trial expires. NULL if no promo claimed.';

-- ── Seed the founding-business campaign (default 300 slots / 60 days) ───
-- Idempotent: re-running this migration will not reset an already-running
-- campaign's counters.
INSERT INTO public.promo_campaigns (slug, name, max_claims, trial_days)
VALUES ('founding_business_2026', 'Founding Business — Free Trial', 300, 60)
ON CONFLICT (slug) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────
-- All writes go through claim_new_business_promo() (SECURITY DEFINER,
-- below), which bypasses RLS as the function owner — mirroring the
-- existing pattern used by bookme_auto_complete_past_bookings() for
-- bookings/notifications. No INSERT/UPDATE policies are granted to the
-- authenticated role directly.
ALTER TABLE public.promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_campaigns_select_active" ON public.promo_campaigns
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "promo_claims_select_own" ON public.promo_claims
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ── Atomic, idempotent claim function ────────────────────────────────────
-- Called once, right after a business's profile row is created during
-- registration. Safe to call more than once for the same profile (e.g. a
-- retried request after a dropped connection) — it will simply return the
-- existing grant instead of claiming a second slot.
CREATE OR REPLACE FUNCTION public.claim_new_business_promo(
  p_campaign_slug text,
  p_profile_id uuid
)
RETURNS TABLE (
  eligible boolean,
  already_claimed boolean,
  slot_number integer,
  max_claims integer,
  trial_start_at timestamp with time zone,
  trial_end_at timestamp with time zone,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_caller_user_id uuid := auth.uid();
  v_campaign record;
  v_existing record;
  v_new_slot integer;
  v_trial_end timestamp with time zone;
BEGIN
  -- The profile must exist and belong to whoever is calling this (prevents
  -- claiming a slot on behalf of someone else's business via a forged id).
  SELECT id, user_id INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id;

  IF v_profile.id IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::integer, NULL::integer, NULL::timestamptz, NULL::timestamptz, 'profile_not_found'::text;
    RETURN;
  END IF;

  IF v_caller_user_id IS NULL OR v_profile.user_id <> v_caller_user_id THEN
    RETURN QUERY SELECT false, false, NULL::integer, NULL::integer, NULL::timestamptz, NULL::timestamptz, 'not_authorized'::text;
    RETURN;
  END IF;

  -- Idempotency fast-path: already claimed, just return the existing grant.
  SELECT pc.* INTO v_existing
  FROM public.promo_claims pc
  JOIN public.promo_campaigns camp ON camp.id = pc.campaign_id
  WHERE camp.slug = p_campaign_slug
    AND pc.profile_id = p_profile_id;

  IF v_existing.id IS NOT NULL THEN
    RETURN QUERY
      SELECT true, true, v_existing.slot_number,
             (SELECT max_claims FROM public.promo_campaigns WHERE id = v_existing.campaign_id),
             v_existing.trial_start_at, v_existing.trial_end_at, 'already_claimed'::text;
    RETURN;
  END IF;

  -- Lock the campaign row. Any other concurrent call for this same
  -- campaign now blocks here until this transaction commits or rolls
  -- back, which is what makes the check-then-increment below safe under
  -- simultaneous registrations.
  SELECT * INTO v_campaign
  FROM public.promo_campaigns
  WHERE slug = p_campaign_slug
  FOR UPDATE;

  IF v_campaign.id IS NULL THEN
    RETURN QUERY SELECT false, false, NULL::integer, NULL::integer, NULL::timestamptz, NULL::timestamptz, 'campaign_not_found'::text;
    RETURN;
  END IF;

  IF NOT v_campaign.is_active
     OR (v_campaign.ends_at IS NOT NULL AND now() > v_campaign.ends_at)
     OR v_campaign.claims_count >= v_campaign.max_claims THEN
    RETURN QUERY
      SELECT false, false, NULL::integer, v_campaign.max_claims, NULL::timestamptz, NULL::timestamptz, 'limit_reached'::text;
    RETURN;
  END IF;

  v_new_slot := v_campaign.claims_count + 1;
  v_trial_end := now() + make_interval(days => v_campaign.trial_days);

  -- Grouped in a sub-block so that if the INSERT below ever hits the
  -- (campaign_id, profile_id) unique constraint — e.g. a second concurrent
  -- call for the very same profile that slipped past the idempotency
  -- check above before this one took the row lock — the counter
  -- increment is rolled back too (PL/pgSQL exception blocks act as an
  -- implicit savepoint), so no slot is silently burned.
  BEGIN
    UPDATE public.promo_campaigns
    SET claims_count = v_new_slot,
        updated_at = now()
    WHERE id = v_campaign.id;

    INSERT INTO public.promo_claims (
      campaign_id, profile_id, user_id, slot_number, trial_start_at, trial_end_at
    ) VALUES (
      v_campaign.id, p_profile_id, v_caller_user_id, v_new_slot, now(), v_trial_end
    );
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.promo_claims
    WHERE campaign_id = v_campaign.id AND profile_id = p_profile_id;

    RETURN QUERY
      SELECT true, true, v_existing.slot_number, v_campaign.max_claims,
             v_existing.trial_start_at, v_existing.trial_end_at, 'already_claimed'::text;
    RETURN;
  END;

  UPDATE public.profiles
  SET promo_claimed = true,
      promo_campaign_slug = p_campaign_slug,
      promo_slot_number = v_new_slot,
      promo_trial_start_at = now(),
      promo_trial_end_at = v_trial_end,
      updated_at = now()
  WHERE id = p_profile_id;

  RETURN QUERY SELECT true, false, v_new_slot, v_campaign.max_claims, now(), v_trial_end, 'granted'::text;
END;
$$;

COMMENT ON FUNCTION public.claim_new_business_promo(text, uuid) IS
  'Atomically claims one slot in a promo campaign for the calling user''s own profile, or reports why it could not (limit_reached / already_claimed / not_authorized). Concurrency-safe via row lock on promo_campaigns; idempotent per profile via the promo_claims unique constraint.';

GRANT EXECUTE ON FUNCTION public.claim_new_business_promo(text, uuid) TO authenticated;
