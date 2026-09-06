import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName,
}: StatsCardProps) {
  return (
    <div className={cn("min-w-0 bg-card rounded-xl border border-border p-3 sm:p-5 flex items-start justify-between gap-2", className)}>
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {description && (
          <p className="text-xs text-primary font-medium mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs font-medium mt-1",
            trend.isPositive ? "text-primary" : "text-destructive"
          )}>
            ↑ {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% this week
          </p>
        )}
      </div>
      <div className={cn("hidden sm:block shrink-0 p-2.5 rounded-lg bg-muted", iconClassName)}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
  );
}
