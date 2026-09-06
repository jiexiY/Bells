-- Function to transfer role to another member in the same company
CREATE OR REPLACE FUNCTION public.transfer_role_to_member(
  _company_id uuid,
  _target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _caller_department department;
  _target_membership_exists boolean;
BEGIN
  -- Get caller's current role and department in this company
  SELECT role, department INTO _caller_role, _caller_department
  FROM public.company_memberships
  WHERE company_id = _company_id
    AND user_id = auth.uid()
    AND is_active = true;
  
  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;
  
  -- Check if target user is a member of this company
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id
      AND user_id = _target_user_id
      AND is_active = true
  ) INTO _target_membership_exists;
  
  IF NOT _target_membership_exists THEN
    RAISE EXCEPTION 'Target user is not an active member of this workspace';
  END IF;
  
  -- Cannot transfer to yourself
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer role to yourself';
  END IF;
  
  -- Update target user's membership to caller's role
  UPDATE public.company_memberships
  SET role = _caller_role,
      department = _caller_department
  WHERE company_id = _company_id
    AND user_id = _target_user_id;
  
  -- Downgrade caller to member role
  UPDATE public.company_memberships
  SET role = 'member',
      department = COALESCE(_caller_department, 'tech')
  WHERE company_id = _company_id
    AND user_id = auth.uid();
END;
$$;

-- Function to leave a workspace
CREATE OR REPLACE FUNCTION public.leave_workspace(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _member_count integer;
BEGIN
  -- Get caller's role
  SELECT role INTO _caller_role
  FROM public.company_memberships
  WHERE company_id = _company_id
    AND user_id = auth.uid()
    AND is_active = true;
  
  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;
  
  -- Count active members in this company
  SELECT COUNT(*) INTO _member_count
  FROM public.company_memberships
  WHERE company_id = _company_id AND is_active = true;
  
  -- If project_lead and last remaining lead, must transfer first
  IF _caller_role = 'project_lead' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = _company_id
        AND user_id != auth.uid()
        AND role = 'project_lead'
        AND is_active = true
    ) AND _member_count > 1 THEN
      RAISE EXCEPTION 'You are the only project lead. Transfer your role before leaving.';
    END IF;
  END IF;
  
  -- Deactivate the membership (soft delete)
  UPDATE public.company_memberships
  SET is_active = false
  WHERE company_id = _company_id
    AND user_id = auth.uid();
END;
$$;