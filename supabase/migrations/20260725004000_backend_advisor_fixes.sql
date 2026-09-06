-- Follow-up hardening and query-plan improvements from Supabase advisors.

-- Legacy helpers are no longer part of Bells authorization and must not be callable.
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
revoke execute on function public.get_user_role(uuid) from authenticated;
revoke execute on function public.get_user_department(uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.update_updated_at_column() from authenticated;

-- Cover all foreign-key lookup paths used by RLS and cascade operations.
create index if not exists announcements_company_idx on public.announcements(company_id);
create index if not exists announcements_project_idx on public.announcements(project_id);
create index if not exists document_annotations_document_idx on public.document_annotations(document_id);
create index if not exists documents_company_idx on public.documents(company_id);
create index if not exists documents_project_idx on public.documents(project_id);
create index if not exists invitations_company_idx on public.invitations(company_id);
create index if not exists notifications_company_idx on public.notifications(company_id);
create index if not exists projects_lead_idx on public.projects(lead_id);
create index if not exists task_submissions_submitter_idx on public.task_submissions(submitted_by);
create index if not exists tasks_assigned_by_idx on public.tasks(assigned_by);

-- Consolidate equivalent permissive policies so each operation evaluates one policy.
drop policy if exists "Leads view company invitations" on public.invitations;
drop policy if exists "Invitees view own invitations" on public.invitations;
create policy "Users view relevant invitations" on public.invitations
  for select to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    or lower(email) = lower(coalesce(
      (select p.email from public.profiles p where p.user_id = (select auth.uid())),
      ''
    ))
  );

drop policy if exists "Project managers view company projects" on public.projects;
drop policy if exists "Team leads view department projects" on public.projects;
drop policy if exists "Contributors view assigned projects" on public.projects;
create policy "Members view permitted company projects" on public.projects
  for select to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and department = private.membership_department(company_id)
    )
    or (
      private.has_company_role(company_id, array['member'::public.app_role])
      and private.user_has_task_in_project(id)
    )
  );

drop policy if exists "Leads update company projects" on public.projects;
create policy "Leads update permitted company projects" on public.projects
  for update to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and department = private.membership_department(company_id)
    )
  )
  with check (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and department = private.membership_department(company_id)
    )
  );

drop policy if exists "Project managers view company tasks" on public.tasks;
drop policy if exists "Team leads view department tasks" on public.tasks;
drop policy if exists "Contributors view assigned tasks" on public.tasks;
drop policy if exists "Assignees view tasks they created" on public.tasks;
create policy "Members view permitted company tasks" on public.tasks
  for select to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and (project_id is null or private.project_is_in_member_department(project_id, company_id))
    )
    or (
      assigned_to = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
    or (
      assigned_by = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
  );

drop policy if exists "Leads update company tasks" on public.tasks;
drop policy if exists "Contributors update assigned tasks" on public.tasks;
create policy "Members update permitted company tasks" on public.tasks
  for update to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and (project_id is null or private.project_is_in_member_department(project_id, company_id))
    )
    or (
      assigned_to = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
  )
  with check (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and (project_id is null or private.project_is_in_member_department(project_id, company_id))
    )
    or (
      assigned_to = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
  );
