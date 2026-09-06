-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;

CREATE POLICY "Project leads can insert projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead'::app_role) 
  OR has_company_role(auth.uid(), ARRAY['project_lead'::app_role, 'team_lead'::app_role])
);