-- Allow users to see tasks they assigned (assigned_by)
CREATE POLICY "Users see tasks they assigned"
ON public.tasks FOR SELECT
TO authenticated
USING (assigned_by = auth.uid());
