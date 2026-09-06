-- Remove the redundant policy that may cause issues (existing policies already cover leads)
DROP POLICY IF EXISTS "Leads can view invite codes" ON public.projects;