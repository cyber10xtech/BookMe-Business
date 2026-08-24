import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepLocationProps {
  data: { address: string; city: string; state: string };
  onChange: (data: Partial<StepLocationProps["data"]>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepLocation = ({ data, onChange, onNext, onBack }: StepLocationProps) => {
  const isValid = data.address && data.city && data.state;

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          onChange({
            address: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`,
          });
        },
        () => {}
      );
    }
  };

  return (
    <div className="bg-card rounded-3xl p-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-2xl font-bold text-foreground mb-1">Your Location</h2>
      <p className="text-muted-foreground mb-6">Where is your business located?</p>

      <Button
        variant="outline"
        onClick={handleGPS}
        className="w-full h-12 rounded-xl mb-5 border-dashed border-2"
      >
        <MapPin className="w-4 h-4 mr-2" /> Use my current location
      </Button>

      <div className="space-y-5">
        <div>
          <Label className="text-sm font-semibold text-foreground">Address</Label>
          <Input
            placeholder="Street address"
            value={data.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className="mt-1.5 h-12 rounded-xl bg-secondary border-0"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">City</Label>
          <Input
            placeholder="City"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className="mt-1.5 h-12 rounded-xl bg-secondary border-0"
          />
        </div>
        <div>
          <Label className="text-sm font-semibold text-foreground">State</Label>
          <Input
            placeholder="State"
            value={data.state}
            onChange={(e) => onChange({ state: e.target.value })}
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

export default StepLocation;
