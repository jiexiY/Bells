-- Fix: Change SELECT policies from RESTRICTIVE to PERMISSIVE
-- Currently all are RESTRICTIVE which means ALL must pass (AND logic)
-- They should be PERMISSIVE so ANY can grant access (OR logic)

DROP POLICY IF EXISTS "Project leads see all projects" ON public.projects;
CREATE POLICY "Project leads see all projects" ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'project_lead'));

DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
CREATE POLICY "Team leads see department projects" ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_lead') AND department = get_user_department(auth.uid()));

DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;
CREATE POLICY "Members see projects with their tasks" ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'member') AND user_has_tasks_in_project(auth.uid(), id));

-- Also fix INSERT, UPDATE, DELETE policies to be PERMISSIVE
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;
CREATE POLICY "Project leads can insert projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'project_lead') OR has_company_role(auth.uid(), ARRAY['project_lead'::app_role, 'team_lead'::app_role]));

DROP POLICY IF EXISTS "Project leads can update projects" ON public.projects;
CREATE POLICY "Project leads can update projects" ON public.projects
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'project_lead'));

DROP POLICY IF EXISTS "Project leads can delete projects" ON public.projects;
CREATE POLICY "Project leads can delete projects" ON public.projects
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'project_lead'));