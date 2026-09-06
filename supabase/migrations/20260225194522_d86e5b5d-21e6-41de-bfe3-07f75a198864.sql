-- Add invite_code column to projects
ALTER TABLE public.projects ADD COLUMN invite_code text UNIQUE;

-- Generate unique invite codes for all existing projects
UPDATE public.projects
SET invite_code = upper(substr(md5(id::text || random()::text), 1, 8))
WHERE invite_code IS NULL;

-- Make it not-null going forward with a default
ALTER TABLE public.projects ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 8));
ALTER TABLE public.projects ALTER COLUMN invite_code SET NOT NULL;

-- Create a table to track who joined via invite code
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see project members for projects they belong to
CREATE POLICY "Members see project members"
  ON public.project_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- Allow inserts via service role (edge function)
CREATE POLICY "Service role can insert members"
  ON public.project_members FOR INSERT
  WITH CHECK (true);

-- Allow project leads to view invite codes
CREATE POLICY "Leads can view invite codes"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'project_lead'::app_role)
    OR has_role(auth.uid(), 'team_lead'::app_role)
    OR id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid())
  );