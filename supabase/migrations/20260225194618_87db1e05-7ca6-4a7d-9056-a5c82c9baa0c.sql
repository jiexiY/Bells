-- Fix: Tighten insert policy to require authenticated user and own user_id
DROP POLICY "Service role can insert members" ON public.project_members;

CREATE POLICY "Authenticated can join projects"
  ON public.project_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);