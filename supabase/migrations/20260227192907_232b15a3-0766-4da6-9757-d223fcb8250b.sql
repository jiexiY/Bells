
-- Create a security definer function to check company membership role
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND role = ANY(_roles)
  )
$$;

-- Drop and recreate the insert policy using the security definer function
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;

CREATE POLICY "Project leads can insert projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead') 
  OR has_company_role(auth.uid(), ARRAY['project_lead', 'team_lead']::app_role[])
);
