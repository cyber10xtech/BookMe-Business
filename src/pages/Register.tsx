import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [hours, setHours] = useState<Record<string, DayHours>>(defaultHours());
  const [showWelcomePromo, setShowWelcomePromo] = useState(false);
  const [promoClaim, setPromoClaim] = useState<PromoClaimResult | null>(null);

  const routerLocation = useLocation();
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setEmail(user.email || "");
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (prof) {
          if (prof.role === "provider" && prof.onboarding_status === "complete") {
            navigate("/dashboard", { replace: true });
            return;
          }
          setAboutYou((prev) => ({
            ...prev,
            businessName: prof.business_name || user.user_metadata?.business_name || prev.businessName,
            ownerName: prof.full_name || user.user_metadata?.full_name || prev.ownerName,
            phone: prof.phone || user.user_metadata?.phone || prev.phone,
          }));
          if (prof.address || prof.city || prof.state) {
            setLocation({
              address: prof.address || "",
              city: prof.city || "",
              state: prof.state || "",
              latitude: prof.latitude || undefined,
              longitude: prof.longitude || undefined,
            });
          }
          if (prof.category) {
            setCategory(prof.category as CategoryId);
          }
          if (prof.category_locked) {
            setCategoryLocked(true);
          }
          if (prof.business_hours && typeof prof.business_hours === "object") {
            setHours(prof.business_hours as Record<string, DayHours>);
          }
          if ((routerLocation.state as any)?.resuming) {
            setStep(2);
          }
        }
      }
    });
  }, [navigate, routerLocation.state]);

  const handleEmailContinue = () => {
    if (!email) return;
    setStep(2);
  };

  const handleComplete = async (referralSource: ReferralSource) => {
    if (isSubmittingRef.current) return;

    // Strict validation before submission
    if (!category) {
      toast.error("Please select a valid business category.");
      setStep(4);
      return;
    }

    const hasEnabledHour = Object.values(hours).some((h) => h.enabled);
    if (!hasEnabledHour) {
      toast.error("Please enable at least one business day in your business hours.");
      setStep(6);
      return;
    }

    if (!aboutYou.businessName.trim() || !aboutYou.ownerName.trim() || !aboutYou.phone.trim()) {
      toast.error("Please fill in all required business details.");
      setStep(2);
      return;
    }

    if (!location.address.trim() || !location.city.trim() || !location.state.trim()) {
      toast.error("Please enter your complete business location.");
      setStep(3);
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    let claimResult: PromoClaimResult | null = null;

    try {
      // 1. Check if user is already authenticated (e.g. from resume flow)
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      let authUserId = existingUser?.id;

      if (!authUserId) {
        // Sign up new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: aboutYou.password,
          options: {
            data: {
              full_name: aboutYou.ownerName.trim(),
              business_name: aboutYou.businessName.trim(),
              owner_name: aboutYou.ownerName.trim(),
              phone: aboutYou.phone.trim(),
              address: location.address.trim(),
              city: location.city.trim(),
              state: location.state.trim(),
              latitude: location.latitude,
              longitude: location.longitude,
              category,
              business_hours: hours,
              role: "provider",
            },
          },
        });

        if (authError) {
          if (authError.message.toLowerCase().includes("already registered")) {
            toast.error("An account with this email already exists. Please sign in to resume setup.");
            setStep(1);
            return;
          }
          throw authError;
        }

        authUserId = authData.user?.id;
      }

      if (!authUserId) {
        throw new Error("Unable to establish user account. Please try again.");
      }

      // 2. Prepare serialized service rows
      const lockedSvcs = services.filter((s) => s.isLocked);
      const customSvcs = services.filter((s) => !s.isLocked);
      const ordered = [...lockedSvcs, ...customSvcs];

      const serializedServices = ordered.map((svc, idx) => ({
        name: svc.name.trim(),
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
        }),
        is_active: true,
        is_featured: !!svc.isLocked,
      }));

      const idempotencyKey = `reg_${authUserId}_${Date.now()}`;

      // 3. Execute transactional server-side provider onboarding RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc("complete_provider_onboarding", {
        p_business_name: aboutYou.businessName.trim(),
        p_owner_name: aboutYou.ownerName.trim(),
        p_phone: aboutYou.phone.trim(),
        p_category: category,
        p_business_hours: hours,
        p_address: location.address.trim(),
        p_city: location.city.trim(),
        p_state: location.state.trim(),
        p_latitude: location.latitude ?? null,
        p_longitude: location.longitude ?? null,
        p_services: serializedServices,
        p_referral_source: referralSource,
        p_idempotency_key: idempotencyKey,
      });

      if (rpcError) throw rpcError;
      if (!rpcData || !rpcData.success) {
        throw new Error(rpcData?.message || "Failed to complete provider setup.");
      }

      const profileId = rpcData.profile_id;

      // 4. Best-effort post-transaction service image uploads (non-blocking)
      try {
        const customWithImages = customSvcs.filter((s) => s.imageDataUrls?.length);
        if (customWithImages.length > 0) {
          for (const svc of customWithImages) {
            const urls = await uploadDataUrls(authUserId, svc.imageDataUrls || []);
            if (urls.length > 0) {
              await supabase
                .from("services")
                .update({
                  description: JSON.stringify({
                    pricingType: svc.pricingType,
                    maxPrice: svc.maxPrice,
                    isLocked: svc.isLocked,
                    lockedKey: svc.lockedKey,
                    emoji: svc.emoji,
                    imageUrls: urls,
                  }),
                })
                .eq("provider_id", profileId)
                .eq("name", svc.name.trim());
            }
          }
        }
      } catch (imgErr) {
        console.warn("Service image upload failed post-onboarding (non-fatal):", imgErr);
      }

      // 5. Claim founding-business promo slot (best effort, idempotent)
      if (profileId) {
        try {
          const { data: claimRows, error: claimError } = await supabase.rpc(
            "claim_new_business_promo",
            {
              p_campaign_slug: FOUNDING_BUSINESS_PROMO_SLUG,
              p_profile_id: profileId,
            }
          );
          if (!claimError && claimRows) {
            const claim = (Array.isArray(claimRows) ? claimRows[0] : claimRows) as PromoClaimResult | undefined;
            if (claim) claimResult = claim;
          }
        } catch (promoErr) {
          console.warn("Founding-business promo claim failed (non-fatal):", promoErr);
        }
      }

      // 6. Navigation: show promo modal if granted slot, otherwise straight to dashboard
      if (claimResult?.eligible) {
        setPromoClaim(claimResult);
        setShowWelcomePromo(true);
      } else {
        toast.success("Business profile created successfully!");
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error(err.message || "Registration failed. Please try again.");
    } finally {
      isSubmittingRef.current = false;
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
              if (categoryLocked) {
                toast.info("Your business category is locked and cannot be changed.");
                return;
              }
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
