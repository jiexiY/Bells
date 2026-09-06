
-- Update team lead task policies to handle null project_id
DROP POLICY IF EXISTS "Team leads can insert tasks" ON public.tasks;
CREATE POLICY "Team leads can insert tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'team_lead') AND (
    project_id IS NULL 
    OR project_has_department(project_id, get_user_department(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Team leads can update tasks" ON public.tasks;
CREATE POLICY "Team leads can update tasks" ON public.tasks
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'team_lead') AND (
    project_id IS NULL 
    OR project_has_department(project_id, get_user_department(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Team leads see department tasks" ON public.tasks;
CREATE POLICY "Team leads see department tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'team_lead') AND (
    project_id IS NULL 
    OR project_has_department(project_id, get_user_department(auth.uid()))
  )
);

-- Also allow project leads to insert tasks
DROP POLICY IF EXISTS "Project leads can insert tasks" ON public.tasks;
CREATE POLICY "Project leads can insert tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead')
  OR has_company_role(auth.uid(), ARRAY['project_lead']::app_role[])
);
