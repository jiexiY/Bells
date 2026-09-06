-- Fix infinite recursion: replace the "Members see projects with their tasks" policy
-- with a security definer function that avoids cross-table policy evaluation

CREATE OR REPLACE FUNCTION public.user_has_tasks_in_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE assigned_to = _user_id AND project_id = _project_id
  )
$$;

-- Drop the problematic policy and recreate with the function
DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;

CREATE POLICY "Members see projects with their tasks"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'member'::app_role)
    AND user_has_tasks_in_project(auth.uid(), id)
  );