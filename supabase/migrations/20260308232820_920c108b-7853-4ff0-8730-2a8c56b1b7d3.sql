
-- Add company_id to projects table
ALTER TABLE public.projects ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to tasks table  
ALTER TABLE public.tasks ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop old SELECT policies on projects that don't scope by company
DROP POLICY IF EXISTS "Project leads see all projects" ON public.projects;
DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can delete projects" ON public.projects;

-- New company-scoped SELECT policies for projects
CREATE POLICY "Project leads see company projects" ON public.projects FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads see department company projects" ON public.projects FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND department = get_user_department(auth.uid())
);

CREATE POLICY "Members see projects with their tasks" ON public.projects FOR SELECT TO authenticated
USING (
  (has_company_role(auth.uid(), ARRAY['member'::app_role]))
  AND user_has_tasks_in_project(auth.uid(), id)
);

-- INSERT policy scoped by company
CREATE POLICY "Leads can insert company projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role IN ('project_lead', 'team_lead') AND is_active = true
  )
);

-- UPDATE policy scoped by company
CREATE POLICY "Project leads can update company projects" ON public.projects FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

-- DELETE policy scoped by company
CREATE POLICY "Project leads can delete company projects" ON public.projects FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

-- Drop old SELECT policies on tasks that don't scope by company
DROP POLICY IF EXISTS "Project leads see all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads see department tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members see assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users see tasks they assigned" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks they assigned" ON public.tasks;

-- New company-scoped SELECT policies for tasks
CREATE POLICY "Project leads see company tasks" ON public.tasks FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads see company department tasks" ON public.tasks FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND ((project_id IS NULL) OR project_has_department(project_id, get_user_department(auth.uid())))
);

CREATE POLICY "Members see assigned tasks" ON public.tasks FOR SELECT TO authenticated
USING (assigned_to = auth.uid());

CREATE POLICY "Users see tasks they assigned" ON public.tasks FOR SELECT TO authenticated
USING (assigned_by = auth.uid());

-- INSERT policies
CREATE POLICY "Project leads can insert company tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads can insert company tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND ((project_id IS NULL) OR project_has_department(project_id, get_user_department(auth.uid())))
);

-- UPDATE policies
CREATE POLICY "Project leads can update company tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads can update company tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND ((project_id IS NULL) OR project_has_department(project_id, get_user_department(auth.uid())))
);

CREATE POLICY "Members can update own tasks" ON public.tasks FOR UPDATE TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- DELETE policies
CREATE POLICY "Project leads can delete company tasks" ON public.tasks FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Users can delete tasks they assigned" ON public.tasks FOR DELETE TO authenticated
USING (assigned_by = auth.uid());
