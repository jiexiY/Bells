-- Fix all restrictive SELECT policies on projects table to be PERMISSIVE

-- Drop and recreate Project leads see all projects
DROP POLICY IF EXISTS "Project leads see all projects" ON public.projects;
CREATE POLICY "Project leads see all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'project_lead'::app_role)
  OR has_company_role(auth.uid(), ARRAY['project_lead'::app_role])
);

-- Drop and recreate Team leads see department projects  
DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
CREATE POLICY "Team leads see department projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_lead'::app_role) AND (department = get_user_department(auth.uid()))
  OR (has_company_role(auth.uid(), ARRAY['team_lead'::app_role]) AND (department = get_user_department(auth.uid())))
);

-- Drop and recreate Members see projects with their tasks
DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;
CREATE POLICY "Members see projects with their tasks"
ON public.projects
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'member'::app_role) OR has_company_role(auth.uid(), ARRAY['member'::app_role]))
  AND user_has_tasks_in_project(auth.uid(), id)
);