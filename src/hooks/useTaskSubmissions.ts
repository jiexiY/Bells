import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaskSubmission {
  id: string;
  task_id: string;
  submitted_by: string;
  submission_type: string;
  submission_url: string | null;
  submission_file_url: string | null;
  comment: string | null;
  attempt_number: number;
  created_at: string;
}

export function useTaskSubmissions(taskId: string | null) {
  return useQuery({
    queryKey: ["task_submissions", taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_submissions")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return Promise.all((data || []).map(async (submission) => {
        if (!submission.submission_file_url) return submission as TaskSubmission;
        const { data: signed } = await supabase.storage
          .from("project-files")
          .createSignedUrl(submission.submission_file_url, 60 * 60);
        return {
          ...submission,
          submission_file_url: signed?.signedUrl || null,
        } as TaskSubmission;
      }));
    },
  });
}
