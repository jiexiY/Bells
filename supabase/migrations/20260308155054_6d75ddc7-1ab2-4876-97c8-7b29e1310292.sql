-- Allow task creators (assigned_by) to delete tasks they assigned
CREATE POLICY "Users can delete tasks they assigned"
ON public.tasks FOR DELETE
TO authenticated
USING (assigned_by = auth.uid());

-- Allow project leads to delete any task
CREATE POLICY "Project leads can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'project_lead'::app_role));
