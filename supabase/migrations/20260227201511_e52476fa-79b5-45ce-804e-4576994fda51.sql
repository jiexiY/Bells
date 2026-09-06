
-- Track every submission attempt (Canvas-like submission history)
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN ('file', 'link', 'none')),
  submission_url text,
  submission_file_url text,
  comment text,
  attempt_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Members see their own submissions
CREATE POLICY "Members see own submissions"
ON public.task_submissions FOR SELECT
USING (submitted_by = auth.uid());

-- Leads see submissions for tasks they manage
CREATE POLICY "Project leads see all submissions"
ON public.task_submissions FOR SELECT
USING (has_role(auth.uid(), 'project_lead'::app_role));

CREATE POLICY "Team leads see department submissions"
ON public.task_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'team_lead'::app_role) AND
  task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.project_id IS NULL OR project_has_department(t.project_id, get_user_department(auth.uid()))
  )
);

-- Authenticated members can insert submissions
CREATE POLICY "Members can submit"
ON public.task_submissions FOR INSERT
WITH CHECK (submitted_by = auth.uid());
