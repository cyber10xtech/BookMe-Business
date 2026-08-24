import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepAboutYouProps {
  data: {
    businessName: string;
    ownerName: string;
    phone: string;
    password: string;
  };
  onChange: (data: Partial<StepAboutYouProps["data"]>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepAboutYou = ({ data, onChange, onNext, onBack }: StepAboutYouProps) => {
  const isValid = data.businessName && data.ownerName && data.phone && data.password.length >= 6;

  return (
    <div className="bg-card rounded-3xl p-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-2xl font-bold text-foreground mb-1">About You</h2>
      <p className="text-muted-foreground mb-6">Tell us more about yourself and your business</p>

      <div className="space-y-5">
        <div>
          <Label className="text-sm font-semibold text-foreground">Business Name</Label>
          <Input
            placeholder="e.g. Toni Cuts Barbershop"
            value={data.businessName}
            onChange={(e) => onChange({ businessName: e.target.value })}
            className="mt-1.5 h-12 rounded-xl bg-secondary border-0"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Your Name</Label>
          <Input
            placeholder="Your full name"
            value={data.ownerName}
            onChange={(e) => onChange({ ownerName: e.target.value })}
            className="mt-1.5 h-12 rounded-xl bg-secondary border-0"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Your Phone Number</Label>
          <div className="flex gap-2 mt-1.5">
            <div className="flex items-center gap-1.5 px-3 h-12 rounded-xl bg-secondary text-sm min-w-[90px]">
              🇳🇬 +234
            </div>
            <Input
              placeholder="800 000 0000"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="h-12 rounded-xl bg-secondary border-0"
            />
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">Password</Label>
          <Input
            type="password"
            placeholder="Min. 6 characters"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            className="mt-1.5 h-12 rounded-xl bg-secondary border-0"
          />
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="w-full h-14 mt-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
      >
        Continue <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
};

export default StepAboutYou;
