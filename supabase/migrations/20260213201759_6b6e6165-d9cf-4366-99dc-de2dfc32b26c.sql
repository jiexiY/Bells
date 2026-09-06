
-- Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  department public.department NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone NULL
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Company members (leads) can see invitations for their company
CREATE POLICY "Company leads see invitations"
ON public.invitations FOR SELECT
USING (
  company_id IN (
    SELECT cm.company_id FROM company_memberships cm
    WHERE cm.user_id = auth.uid()
  )
);

-- Invitees can see their own invitations by email
CREATE POLICY "Invitees see own invitations"
ON public.invitations FOR SELECT
USING (
  email IN (
    SELECT p.email FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Leads can create invitations
CREATE POLICY "Leads can invite"
ON public.invitations FOR INSERT
WITH CHECK (
  invited_by = auth.uid()
  AND company_id IN (
    SELECT cm.company_id FROM company_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.role IN ('project_lead', 'team_lead')
  )
);

-- Invitees can update (accept/decline) their own invitations
CREATE POLICY "Invitees can respond"
ON public.invitations FOR UPDATE
USING (
  email IN (
    SELECT p.email FROM profiles p WHERE p.user_id = auth.uid()
  )
);
