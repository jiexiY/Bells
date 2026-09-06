-- Create a security definer function to check project department without triggering projects RLS
CREATE OR REPLACE FUNCTION public.project_has_department(_project_id uuid, _department department)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND department = _department
  )
$$;

-- Fix tasks policies that cause recursion by referencing projects table
DROP POLICY IF EXISTS "Team leads see department tasks" ON public.tasks;
CREATE POLICY "Team leads see department tasks"
  ON public.tasks FOR SELECT
  USING (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND project_has_department(project_id, get_user_department(auth.uid()))
  );

DROP POLICY IF EXISTS "Team leads can insert tasks" ON public.tasks;
CREATE POLICY "Team leads can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND project_has_department(project_id, get_user_department(auth.uid()))
  );

DROP POLICY IF EXISTS "Team leads can update tasks" ON public.tasks;
CREATE POLICY "Team leads can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND project_has_department(project_id, get_user_department(auth.uid()))
  );

-- Also fix "Team leads see department projects" on projects table
DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
CREATE POLICY "Team leads see department projects"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND department = get_user_department(auth.uid())
  );