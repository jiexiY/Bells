
-- Helper: does user share any active company with target user?
CREATE OR REPLACE FUNCTION public.shares_company_with(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_memberships cm1
    JOIN public.company_memberships cm2 ON cm1.company_id = cm2.company_id
    WHERE cm1.user_id = auth.uid() AND cm1.is_active = true
      AND cm2.user_id = _target AND cm2.is_active = true
  )
$$;

-- profiles
DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
CREATE POLICY "Profiles visible to self and co-members"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_company_with(user_id));

-- user_roles
DROP POLICY IF EXISTS "Anyone authenticated can view roles" ON public.user_roles;
CREATE POLICY "User roles visible to self and co-members"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.shares_company_with(user_id));

-- companies
DROP POLICY IF EXISTS "Authenticated users can see companies" ON public.companies;
CREATE POLICY "Members can see their companies"
  ON public.companies FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), id));

-- storage: project-files bucket. Path convention: `${company_id}/...`
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Company members can view project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Company members can upload project files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND owner = auth.uid()
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Owners can update own project files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND owner = auth.uid()
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'project-files'
    AND owner = auth.uid()
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Owners can delete own project files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND owner = auth.uid()
    AND public.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- Restrict EXECUTE on SECURITY DEFINER functions.
-- Revoke public/anon on all; keep authenticated only where needed.
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_project_status_on_task_change() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_company_role(uuid, app_role[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_company_ids(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.project_has_department(uuid, department) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_tasks_in_project(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_department(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_company_with(uuid) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.close_company_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_company_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_company_member(uuid, uuid, app_role, department) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_role_to_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, app_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.project_has_department(uuid, department) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_tasks_in_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_department(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_company_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_company_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_company_member(uuid, uuid, app_role, department) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_role_to_member(uuid, uuid) TO authenticated;
