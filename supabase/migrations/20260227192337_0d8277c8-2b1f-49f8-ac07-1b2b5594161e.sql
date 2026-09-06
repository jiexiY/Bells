
-- Drop existing insert policy
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;

-- Create new insert policy that checks both user_roles and company_memberships
CREATE POLICY "Project leads can insert projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead') 
  OR EXISTS (
    SELECT 1 FROM public.company_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('project_lead', 'team_lead')
  )
);
