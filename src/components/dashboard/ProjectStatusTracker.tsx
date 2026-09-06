import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FolderCheck, Clock, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectStatusTrackerProps {
  projects: Array<{ status: string }>;
}

const statuses = [
  { key: "assigned", label: "Assigned", icon: FolderCheck, color: "bg-amber-500" },
  { key: "in_progress", label: "In Progress", icon: Clock, color: "bg-blue-500" },
  { key: "pending_approval", label: "Pending", icon: AlertCircle, color: "bg-orange-500" },
  { key: "need_revision", label: "Revision", icon: RotateCcw, color: "bg-purple-500" },
  { key: "complete", label: "Complete", icon: CheckCircle2, color: "bg-emerald-500" },
];

export function ProjectStatusTracker({ projects }: ProjectStatusTrackerProps) {
  const total = projects.length;
  const counts = statuses.map(s => ({
    ...s,
    count: projects.filter(p => p.status === s.key).length,
  }));

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="w-5 h-5 text-primary" />
          Project Status Tracker
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          {total} total project{total !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        {total > 0 && (
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {counts.map(s =>
              s.count > 0 ? (
                <div
                  key={s.key}
                  className={cn("transition-all duration-500", s.color)}
                  style={{ width: `${(s.count / total) * 100}%` }}
                />
              ) : null
            )}
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {counts.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", s.color)} />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-sm font-semibold text-foreground">{s.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
