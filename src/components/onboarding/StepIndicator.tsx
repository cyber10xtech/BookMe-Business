import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator = ({ currentStep, totalSteps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-0 py-6">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                isCompleted
                  ? "bg-success text-success-foreground"
                  : isCurrent
                  ? "bg-card text-foreground border-2 border-border"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : step}
            </div>
            {step < totalSteps && (
              <div
                className={`w-10 h-1 ${
                  isCompleted ? "bg-success" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
