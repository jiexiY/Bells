
CREATE OR REPLACE FUNCTION public.close_company_workspace(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is a project_lead in this company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id
      AND user_id = auth.uid()
      AND role = 'project_lead'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active project leads can close a workspace';
  END IF;

  -- Deactivate ALL memberships for this company
  UPDATE public.company_memberships
  SET is_active = false
  WHERE company_id = _company_id;
END;
$$;
