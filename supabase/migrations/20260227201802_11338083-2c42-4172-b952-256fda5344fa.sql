
-- Allow members to update their own assigned tasks (for submission workflow)
CREATE POLICY "Members can update own tasks"
ON public.tasks
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());
