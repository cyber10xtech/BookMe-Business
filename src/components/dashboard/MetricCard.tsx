interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  onClick?: () => void;
}

const MetricCard = ({ title, value, icon, color = "bg-primary/10", onClick }: MetricCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`bg-card rounded-2xl p-4 border border-border text-left w-full transition-all active:scale-[0.97] ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : "cursor-default"}`}
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      {onClick && (
        <p className="text-[10px] text-primary font-semibold mt-1">Tap to view →</p>
      )}
    </button>
  );
};

export default MetricCard;
