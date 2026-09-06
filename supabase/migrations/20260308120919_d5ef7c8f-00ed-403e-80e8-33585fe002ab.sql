
-- Function: Project Lead removes a Team Lead from company
CREATE OR REPLACE FUNCTION public.remove_company_member(_company_id uuid, _target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _target_role app_role;
BEGIN
  -- Get caller's role in this company
  SELECT role INTO _caller_role
  FROM public.company_memberships
  WHERE company_id = _company_id AND user_id = auth.uid() AND is_active = true;

  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;

  -- Get target's role in this company
  SELECT role INTO _target_role
  FROM public.company_memberships
  WHERE company_id = _company_id AND user_id = _target_user_id AND is_active = true;

  IF _target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not an active member of this workspace';
  END IF;

  -- Cannot remove yourself
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave workspace instead.';
  END IF;

  -- Project Lead can remove Team Leads
  IF _caller_role = 'project_lead' AND _target_role = 'team_lead' THEN
    UPDATE public.company_memberships
    SET is_active = false
    WHERE company_id = _company_id AND user_id = _target_user_id;
    RETURN;
  END IF;

  -- Team Lead can remove Members
  IF _caller_role = 'team_lead' AND _target_role = 'member' THEN
    UPDATE public.company_memberships
    SET is_active = false
    WHERE company_id = _company_id AND user_id = _target_user_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'You do not have permission to remove this member';
END;
$$;

-- Function: Project Lead adds a Team Lead / Team Lead adds a Member
-- This re-activates an inactive membership or is used for role changes
CREATE OR REPLACE FUNCTION public.add_company_member(_company_id uuid, _target_user_id uuid, _target_role app_role, _target_department department DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _existing_membership_id uuid;
BEGIN
  -- Get caller's role
  SELECT role INTO _caller_role
  FROM public.company_memberships
  WHERE company_id = _company_id AND user_id = auth.uid() AND is_active = true;

  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;

  -- Project Lead can add Team Leads
  IF _caller_role = 'project_lead' AND _target_role = 'team_lead' THEN
    -- Check if inactive membership exists
    SELECT id INTO _existing_membership_id
    FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _target_user_id AND is_active = false;

    IF _existing_membership_id IS NOT NULL THEN
      UPDATE public.company_memberships
      SET is_active = true, role = _target_role, department = _target_department
      WHERE id = _existing_membership_id;
    ELSE
      RAISE EXCEPTION 'User must first join the workspace via invite code';
    END IF;
    RETURN;
  END IF;

  -- Team Lead can add Members
  IF _caller_role = 'team_lead' AND _target_role = 'member' THEN
    SELECT id INTO _existing_membership_id
    FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _target_user_id AND is_active = false;

    IF _existing_membership_id IS NOT NULL THEN
      UPDATE public.company_memberships
      SET is_active = true, role = _target_role, department = _target_department
      WHERE id = _existing_membership_id;
    ELSE
      RAISE EXCEPTION 'User must first join the workspace via invite code';
    END IF;
    RETURN;
  END IF;

  RAISE EXCEPTION 'You do not have permission to add this member';
END;
$$;

-- Allow members to see ALL memberships in their company (needed for the management UI)
CREATE POLICY "Members see company memberships"
ON public.company_memberships
FOR SELECT
USING (
  company_id IN (
    SELECT cm.company_id FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid() AND cm.is_active = true
  )
);
