-- Allow authenticated users to see all companies (needed for invitations and newly created companies)
-- Drop the restrictive policy and replace with a broader one
DROP POLICY IF EXISTS "Users see their companies" ON public.companies;

CREATE POLICY "Authenticated users can see companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);