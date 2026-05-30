import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface DayHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface StepBusinessHoursProps {
  hours: Record<string, DayHours>;
  onChange: (hours: Record<string, DayHours>) => void;
  onSubmit: () => void;
  onBack: () => void;
  loading?: boolean;
}

const StepBusinessHours = ({ hours, onChange, onSubmit, onBack, loading }: StepBusinessHoursProps) => {
  const updateDay = (day: string, partial: Partial<DayHours>) => {
    onChange({ ...hours, [day]: { ...hours[day], ...partial } });
  };

  return (
    <div className="bg-card rounded-3xl p-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-2xl font-bold text-foreground mb-1">Business Hours</h2>
      <p className="text-muted-foreground mb-6">When are you available for bookings?</p>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const d = hours[day] || { enabled: false, start: "09:00", end: "17:00" };
          return (
            <div key={day} className="flex items-center gap-3">
              <div className="w-10 text-xs font-semibold text-foreground">{day.slice(0, 3)}</div>
              <select
                value={d.start}
                onChange={(e) => updateDay(day, { start: e.target.value })}
                className="h-10 rounded-lg bg-secondary text-sm px-2 border-0 flex-1"
                disabled={!d.enabled}
              >
                {generateTimes().map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
              <span className="text-muted-foreground">–</span>
              <select
                value={d.end}
                onChange={(e) => updateDay(day, { end: e.target.value })}
                className="h-10 rounded-lg bg-secondary text-sm px-2 border-0 flex-1"
                disabled={!d.enabled}
              >
                {generateTimes().map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
              <Switch
                checked={d.enabled}
                onCheckedChange={(checked) => updateDay(day, { enabled: checked })}
              />
            </div>
          );
        })}
      </div>

      <Button
        onClick={onSubmit}
        disabled={loading}
        className="w-full h-14 mt-6 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
      >
        <Check className="w-5 h-5 mr-2" /> Complete Registration
      </Button>
    </div>
  );
};

function generateTimes() {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    times.push(`${h.toString().padStart(2, "0")}:00`);
    times.push(`${h.toString().padStart(2, "0")}:30`);
  }
  return times;
}

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default StepBusinessHours;
