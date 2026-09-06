import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@/types/project";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  showActions?: boolean;
  onStatusChange?: (taskId: string, status: "approved" | "declined") => void;
  compact?: boolean;
}

export function TaskCard({ task, showActions = false, onStatusChange, compact = false }: TaskCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", compact && "shadow-none border-0 bg-muted/30")}>
      <CardHeader className={cn("pb-2", compact && "p-3 pb-2")}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn("leading-tight", compact ? "text-sm" : "text-base")}>
            {task.title}
          </CardTitle>
          <StatusBadge status={task.status} type="task" />
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-3", compact && "p-3 pt-0")}>
        {!compact && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            <span>{task.assigneeName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        </div>

        {showActions && task.status === "unchecked" && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={() => onStatusChange?.(task.id, "approved")}
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => onStatusChange?.(task.id, "declined")}
            >
              <X className="w-4 h-4 mr-1" />
              Decline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
