import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";
import StepIndicator from "@/components/onboarding/StepIndicator";
import StepAboutYou from "@/components/onboarding/StepAboutYou";
import StepLocation from "@/components/onboarding/StepLocation";
import StepCategory from "@/components/onboarding/StepCategory";
import StepBusinessHours, { DayHours } from "@/components/onboarding/StepBusinessHours";
import StepServices, { ServiceEntry } from "@/components/onboarding/StepServices";
import StepReferral, { ReferralSource } from "@/components/onboarding/StepReferral";
import WelcomePromotionModal from "@/components/onboarding/WelcomePromotionModal";
import { CategoryId } from "@/lib/categories";
import { FOUNDING_BUSINESS_PROMO_SLUG, PromoClaimResult } from "@/lib/promoConfig";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultHours = (): Record<string, DayHours> =>
  Object.fromEntries(DAYS.map((d) => [d, { enabled: false, start: "09:00", end: "17:00" }]));

// Steps:
// 1 = Email / social sign-in
// 2 = About you (name, phone, password)
// 3 = Location
// 4 = Category selection
// 5 = Services (locked + custom, min 3)
// 6 = Business hours
// 7 = Referral source

const TOTAL_STEPS = 7;

function parseDurationToMinutes(dur: string): number {
  let mins = 0;
  const hrMatch = dur.match(/(\d+)\s*hr/);
  const minMatch = dur.match(/(\d+)\s*min/);
  if (hrMatch) mins += parseInt(hrMatch[1]) * 60;
  if (minMatch) mins += parseInt(minMatch[1]);
  return mins || 60;
}

async function uploadDataUrls(userId: string, dataUrls: string[]): Promise<string[]> {
  const uploaded: string[] = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const dataUrl = dataUrls[i];
    if (!dataUrl) continue;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const ext = blob.type.split("/")[1] || "jpg";
      const path = `${userId}/services/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage.from("business-assets").upload(path, blob, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
    } catch {
      // skip failed uploads silently
    }
  }
  return uploaded;
}

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [aboutYou, setAboutYou] = useState({
    businessName: "",
    ownerName: "",
    phone: "",
    password: "",
  });
  const [location, setLocation] = useState({ address: "", city: "", state: "", latitude: undefined as number | undefined, longitude: undefined as number | undefined });
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [hours, setHours] = useState<Record<string, DayHours>>(defaultHours());
  const [showWelcomePromo, setShowWelcomePromo] = useState(false);
  const [promoClaim, setPromoClaim] = useState<PromoClaimResult | null>(null);

  const handleEmailContinue = () => {
    if (!email) return;
    setStep(2);
  };

  const handleComplete = async (referralSource: ReferralSource) => {
    setLoading(true);
    let claimResult: PromoClaimResult | null = null;
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: aboutYou.password,
        options: {
          data: {
            full_name: aboutYou.ownerName,
            business_name: aboutYou.businessName,
            owner_name: aboutYou.ownerName,
            phone: aboutYou.phone,
            address: location.address,
            city: location.city,
            state: location.state,
            latitude: location.latitude,
            longitude: location.longitude,
            category,
            business_hours: hours,
            role: "provider",
          },
        },
      });
      if (error) throw error;

      if (data.user) {
        await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            email,
            full_name: aboutYou.ownerName,
            business_name: aboutYou.businessName,
            owner_name: aboutYou.ownerName,
            phone: aboutYou.phone,
            address: location.address,
            city: location.city,
            state: location.state,
            latitude: location.latitude,
            longitude: location.longitude,
            category: category || "general",
            business_hours: hours,
            role: "provider",
            is_active: true,
            social_links: { referral_source: referralSource },
          } as any,
          { onConflict: "user_id" }
        );

        // Fetch newly created profile id for service insertion
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (profileRow?.id) {
          const lockedSvcs = services.filter((s) => s.isLocked);
          const customSvcs = services.filter((s) => !s.isLocked);
          const ordered = [...lockedSvcs, ...customSvcs];

          const svcRows = await Promise.all(
            ordered.map(async (svc, idx) => {
              const imageUrls = svc.imageDataUrls?.length
                ? await uploadDataUrls(data.user.id, svc.imageDataUrls)
                : [];
              return {
                provider_id: profileRow.id,
                user_id: data.user.id,
                name: svc.name,
                duration: svc.duration,
                duration_minutes: parseDurationToMinutes(svc.duration),
                price: svc.price,
                description: JSON.stringify({
                  pricingType: svc.pricingType,
                  maxPrice: svc.maxPrice,
                  isLocked: svc.isLocked,
                  lockedKey: svc.lockedKey,
                  emoji: svc.emoji,
                  sortOrder: idx,
                  imageUrls,
                }),
                category: category || "general",
                is_active: true,
                is_featured: svc.isLocked,
              };
            })
          );

          await supabase.from("services").insert(svcRows);
        }

        // Attempt to claim a founding-business promo slot for this new
        // profile. This is a best-effort add-on to registration: if it
        // fails for any reason (network blip, campaign not seeded, etc.)
        // the business account itself is already created and valid, so we
        // swallow the error rather than failing the whole signup over a
        // promo. Eligibility/limit enforcement happens server-side in
        // claim_new_business_promo() — the popup below only renders when
        // that function reports `eligible: true`.
        if (profileRow?.id) {
          try {
            const { data: claimRows, error: claimError } = await supabase.rpc(
              "claim_new_business_promo",
              {
                p_campaign_slug: FOUNDING_BUSINESS_PROMO_SLUG,
                p_profile_id: profileRow.id,
              }
            );
            if (claimError) throw claimError;

            const claim = (Array.isArray(claimRows) ? claimRows[0] : claimRows) as
              | PromoClaimResult
              | undefined;

            if (claim) {
              claimResult = claim;
            }
          } catch (promoErr) {
            console.warn("Founding-business promo claim failed (non-fatal):", promoErr);
          }
        }
      }

      // Registration succeeded. Only show the founding-business welcome
      // popup if the backend actually granted a slot — businesses who
      // register after the campaign limit is reached (or if the claim
      // call failed/errored) go straight to the dashboard with no promo
      // shown. `eligible` covers a fresh grant; `already_claimed` is the
      // idempotent-retry case, which shouldn't normally happen on a brand
      // new signup but is handled the same way regardless.
      if (claimResult?.eligible) {
        setPromoClaim(claimResult);
        setShowWelcomePromo(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePromoContinue = () => {
    setShowWelcomePromo(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <div className="flex items-center justify-center gap-3 pt-12 pb-2">
        <img src={logo} alt="BookMe" className="w-12 h-12 rounded-xl" />
        <div>
          <span className="text-lg font-bold text-primary-foreground">BookMe Business</span>
          <p className="text-sm text-primary-foreground/70">Create your account</p>
        </div>
      </div>

      <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

      <div className="flex-1 px-5 pb-8">
        {step === 1 && (
          <div className="bg-card rounded-3xl p-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-1">Sign in</h2>
            <p className="text-muted-foreground mb-6">Create your account or sign in to get started</p>

            <Input
              type="email"
              placeholder="E-Mail Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-xl bg-secondary border-0 mb-4 text-base"
            />

            <Button
              onClick={handleEmailContinue}
              disabled={!email}
              className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-base mb-6"
            >
              <Mail className="w-5 h-5 mr-2" /> Continue with email
            </Button>

            <p className="text-center text-xs text-muted-foreground mt-6">
              By signing up you agree to the{" "}
              <a href="#" className="underline text-foreground">Terms and conditions</a> and to the{" "}
              <a href="#" className="underline text-foreground">privacy policy</a>
            </p>
          </div>
        )}

        {step === 2 && (
          <StepAboutYou
            data={aboutYou}
            onChange={(d) => setAboutYou((prev) => ({ ...prev, ...d }))}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepLocation
            data={location}
            onChange={(d) => setLocation((prev) => ({ ...prev, ...d }))}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepCategory
            selected={category}
            onSelect={(c) => {
              setCategory(c);
              setServices([]);
            }}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}

        {step === 5 && category && (
          <StepServices
            categoryId={category}
            services={services}
            onChange={setServices}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        )}

        {step === 6 && (
          <StepBusinessHours
            hours={hours}
            onChange={setHours}
            onSubmit={() => setStep(7)}
            onBack={() => setStep(5)}
            loading={false}
          />
        )}

        {step === 7 && (
          <StepReferral
            onSelect={handleComplete}
            onBack={() => setStep(6)}
            loading={loading}
          />
        )}
      </div>

      <p className="text-center text-sm text-primary-foreground/70 pb-6">
        Already have an account?{" "}
        <button onClick={() => navigate("/signin")} className="underline text-primary-foreground font-semibold">
          Sign in
        </button>
      </p>

      <WelcomePromotionModal
        open={showWelcomePromo}
        onContinue={handlePromoContinue}
        spotCount={promoClaim?.max_claims ?? undefined}
        trialEndAt={promoClaim?.trial_end_at ?? undefined}
        platformName="BookMe"
      />
    </div>
  );
};

export default Register;
