import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StateLgaSelector from "../common/StateLgaSelector";
import { resolveReadableLocation } from "@/lib/readableLocation";

interface StepLocationProps {
  data: { address: string; city: string; state: string; latitude?: number; longitude?: number };
  onChange: (data: Partial<StepLocationProps["data"]>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepLocation = ({ data, onChange, onNext, onBack }: StepLocationProps) => {
  const isValid = data.address && data.city && data.state;

  const handleGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const address = await resolveReadableLocation({ latitude, longitude, city: data.city, state: data.state });
          onChange({ address, latitude, longitude });
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

        <StateLgaSelector
          stateValue={data.state}
          lgaValue={data.city}
          onStateChange={(state) => onChange({ state })}
          onLgaChange={(city) => onChange({ city })}
          stateLabel="State"
          lgaLabel="City / LGA"
          required
        />
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
