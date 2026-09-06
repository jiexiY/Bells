import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({
  value,
  showLabel = true,
  size = "md",
  className,
}: ProgressBarProps) {
  const getProgressColor = () => {
    if (value >= 75) return "bg-primary";
    if (value >= 50) return "bg-primary/80";
    if (value >= 25) return "bg-primary/60";
    return "bg-primary/40";
  };

  const getHeight = () => {
    switch (size) {
      case "sm": return "h-1.5";
      case "lg": return "h-3";
      default: return "h-2";
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("flex-1 rounded-full bg-muted overflow-hidden", getHeight())}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", getProgressColor())}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
          {value}%
        </span>
      )}
    </div>
  );
}
