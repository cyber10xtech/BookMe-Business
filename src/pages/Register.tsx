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
import { CategoryId } from "@/lib/categories";

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
  const [location, setLocation] = useState({ address: "", city: "", state: "" });
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [hours, setHours] = useState<Record<string, DayHours>>(defaultHours());

  const handleEmailContinue = () => {
    if (!email) return;
    setStep(2);
  };

  const handleComingSoon = () => {
    toast.info("Coming soon! This sign-in method will be available shortly.");
  };

  const handleComplete = async (referralSource: ReferralSource) => {
    setLoading(true);
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
      }

      toast.success("Welcome to Book Me! Your account is ready. 🎉");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
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

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              onClick={handleComingSoon}
              className="w-full h-14 rounded-xl font-semibold text-base bg-foreground text-background hover:bg-foreground/90 mb-3"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Sign In with Apple
            </Button>

            <Button
              variant="outline"
              onClick={handleComingSoon}
              className="w-full h-14 rounded-xl font-semibold text-base border-border"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
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
    </div>
  );
};

export default Register;
