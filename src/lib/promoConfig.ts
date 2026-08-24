/**
 * Identifies which promo campaign new registrations should attempt to
 * claim. The actual limit (max_claims) and trial length (trial_days) are
 * NOT hardcoded here — they live on the `promo_campaigns` row in the
 * database (see supabase/migrations/20260817000000_new_business_founding_promo.sql)
 * so they can be changed with a plain SQL UPDATE, no redeploy required.
 */
export const FOUNDING_BUSINESS_PROMO_SLUG = "founding_business_2026";

/** Shape returned by the claim_new_business_promo() Postgres function. */
export interface PromoClaimResult {
  eligible: boolean;
  already_claimed: boolean;
  slot_number: number | null;
  max_claims: number | null;
  trial_start_at: string | null;
  trial_end_at: string | null;
  reason: string;
}
