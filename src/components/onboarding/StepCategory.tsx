import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CategoryId } from "@/lib/categories";

interface StepCategoryProps {
  selected: CategoryId | null;
  onSelect: (cat: CategoryId) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepCategory = ({ selected, onSelect, onNext, onBack }: StepCategoryProps) => {
  const selectedCat = CATEGORIES.find((c) => c.id === selected);

  if (selected && selectedCat) {
    return (
      <div className="bg-card rounded-3xl p-6 animate-fade-in">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-start justify-between mb-2">
          <h2 className="text-2xl font-bold text-foreground">What is your business?</h2>
          <span className="flex items-center gap-1 text-xs font-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3" /> Locked
          </span>
        </div>
        <p className="text-muted-foreground mb-8">Select a category — this cannot be changed later</p>

        <div className="flex flex-col items-center">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-muted mb-4">
            <img src={selectedCat.image} alt={selectedCat.label} className="w-full h-full object-cover" />
          </div>
          <h3 className="text-xl font-bold text-foreground">{selectedCat.label}</h3>
          <p className="text-sm text-muted-foreground mt-1">Your category is locked</p>
        </div>

        <Button
          onClick={onNext}
          className="w-full h-14 mt-8 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
        >
          Continue <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 animate-fade-in">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h2 className="text-2xl font-bold text-foreground mb-1">What is your business?</h2>
      <p className="text-muted-foreground mb-6">Select a category — this cannot be changed later</p>

      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-transparent group-hover:border-primary transition-all">
              <img src={cat.image} alt={cat.label} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className="text-xs font-semibold text-foreground text-center leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepCategory;
