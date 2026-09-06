
CREATE POLICY "Project leads can delete own company" ON public.companies FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_memberships.company_id = companies.id
      AND company_memberships.user_id = auth.uid()
      AND company_memberships.role = 'project_lead'
      AND company_memberships.is_active = true
  )
);

-- Also allow cascading delete of memberships by company leads
CREATE POLICY "Project leads can delete company memberships" ON public.company_memberships FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm2
    WHERE cm2.company_id = company_memberships.company_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'project_lead'
      AND cm2.is_active = true
  )
);
