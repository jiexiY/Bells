import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function WorkReviewHistory({ taskId, projectId }: { taskId?: string; projectId?: string }) {
  const { data: reviews = [] } = useQuery({
    queryKey: ["work_reviews", taskId, projectId], enabled: !!(taskId || projectId),
    queryFn: async () => {
      const query = supabase.from("work_reviews").select("id,action,comment,created_at").order("created_at", { ascending: false });
      const { data, error } = await (taskId ? query.eq("task_id", taskId) : query.eq("project_id", projectId!));
      if (error) throw error;
      return data;
    },
  });
  if (!reviews.length) return null;
  return <details className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-sm">
    <summary className="cursor-pointer font-medium">Submission & review history ({reviews.length})</summary>
    <ol className="mt-3 space-y-3">{reviews.map(review => <li key={review.id} className="border-l-2 border-primary/30 pl-3">
      <div className="flex flex-wrap justify-between gap-2 text-xs"><strong>{review.action === "need_revision" ? "Revision requested" : review.action === "approved" ? "Approved" : "Submitted for review"}</strong><time className="text-muted-foreground">{new Date(review.created_at).toLocaleString()}</time></div>
      {review.comment && <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">{review.comment}</p>}
    </li>)}</ol>
  </details>;
}
