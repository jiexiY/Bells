-- Bells fresh-backend baseline and security hardening.
-- This migration is designed to follow the imported Lovable base schema.

-- Final application fields.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists job_title text,
  add column if not exists timezone text,
  add column if not exists avatar_url text;

alter table public.companies
  add column if not exists invite_code text;

update public.companies
set invite_code = upper(substr(md5(id::text || random()::text), 1, 8))
where invite_code is null;

alter table public.companies
  alter column invite_code set default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  alter column invite_code set not null;

create unique index if not exists companies_invite_code_key
  on public.companies (invite_code);

alter table public.projects
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.tasks
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists submission_type text,
  add column if not exists submission_url text,
  add column if not exists submission_file_url text,
  alter column project_id drop not null;

alter table public.projects alter column company_id set not null;
alter table public.tasks alter column company_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_submission_type_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks add constraint tasks_submission_type_check
      check (submission_type is null or submission_type in ('file', 'link', 'none'));
  end if;
end
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submission_type text not null check (submission_type in ('file', 'link', 'none')),
  submission_url text,
  submission_file_url text,
  comment text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
alter table public.task_submissions enable row level security;

create index if not exists company_memberships_user_company_idx
  on public.company_memberships (user_id, company_id, is_active);
create index if not exists company_memberships_company_idx
  on public.company_memberships (company_id, is_active);
create index if not exists projects_company_idx on public.projects (company_id);
create index if not exists tasks_company_idx on public.tasks (company_id);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists messages_company_participants_idx
  on public.messages (company_id, sender_id, receiver_id, created_at desc);
create index if not exists task_submissions_task_idx
  on public.task_submissions (task_id, created_at desc);
create index if not exists invitations_email_status_idx
  on public.invitations (lower(email), status);

-- Keep authorization helpers out of the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.has_company_role(
  _company_id uuid,
  _roles public.app_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = _company_id
      and cm.user_id = (select auth.uid())
      and cm.is_active = true
      and (_roles is null or cm.role = any(_roles))
  )
$$;

create or replace function private.user_is_company_member(
  _company_id uuid,
  _user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = _company_id
      and cm.user_id = _user_id
      and cm.is_active = true
  )
$$;

create or replace function private.shares_company(_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships mine
    join public.company_memberships theirs
      on theirs.company_id = mine.company_id
     and theirs.is_active = true
    where mine.user_id = (select auth.uid())
      and mine.is_active = true
      and theirs.user_id = _other_user_id
  )
$$;

create or replace function private.membership_department(_company_id uuid)
returns public.department
language sql
stable
security definer
set search_path = ''
as $$
  select cm.department
  from public.company_memberships cm
  where cm.company_id = _company_id
    and cm.user_id = (select auth.uid())
    and cm.is_active = true
  limit 1
$$;

create or replace function private.user_has_task_in_project(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.project_id = _project_id
      and t.assigned_to = (select auth.uid())
  )
$$;

create or replace function private.project_is_in_member_department(
  _project_id uuid,
  _company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.company_memberships cm on cm.company_id = p.company_id
    where p.id = _project_id
      and p.company_id = _company_id
      and cm.user_id = (select auth.uid())
      and cm.is_active = true
      and cm.role = 'team_lead'::public.app_role
      and p.department = cm.department
  )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Replace all legacy policies with company-scoped policies.
drop policy if exists "Anyone authenticated can view profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users view relevant profiles" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_company(user_id));
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Anyone authenticated can view roles" on public.user_roles;
drop policy if exists "Users can insert own role" on public.user_roles;
create policy "Users view own legacy role" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users see their companies" on public.companies;
drop policy if exists "Authenticated users can see companies" on public.companies;
drop policy if exists "Authenticated can create companies" on public.companies;
drop policy if exists "Project leads can delete own company" on public.companies;
create policy "Members view their companies" on public.companies
  for select to authenticated
  using (private.has_company_role(id, null));
create policy "Project managers delete their companies" on public.companies
  for delete to authenticated
  using (private.has_company_role(id, array['project_lead'::public.app_role]));

drop policy if exists "Users see own memberships" on public.company_memberships;
drop policy if exists "Users can join companies" on public.company_memberships;
drop policy if exists "Users can update own membership" on public.company_memberships;
drop policy if exists "Members see company memberships" on public.company_memberships;
drop policy if exists "Project leads can delete company memberships" on public.company_memberships;
create policy "Members view company memberships" on public.company_memberships
  for select to authenticated
  using (private.has_company_role(company_id, null));

drop policy if exists "Company members see announcements" on public.announcements;
drop policy if exists "Leads can create announcements" on public.announcements;
create policy "Members view company announcements" on public.announcements
  for select to authenticated
  using (
    private.has_company_role(company_id, null)
    and (
      target_role is null
      or private.has_company_role(company_id, array[target_role])
    )
  );
create policy "Leads create company announcements" on public.announcements
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );

drop policy if exists "Users manage own reads" on public.announcement_reads;
drop policy if exists "Users can mark read" on public.announcement_reads;
create policy "Users view own announcement reads" on public.announcement_reads
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users mark announcements read" on public.announcement_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id
        and private.has_company_role(a.company_id, null)
    )
  );

drop policy if exists "Company members see documents" on public.documents;
drop policy if exists "Members can submit documents" on public.documents;
drop policy if exists "Leads can update documents" on public.documents;
create policy "Members view company documents" on public.documents
  for select to authenticated
  using (private.has_company_role(company_id, null));
create policy "Members submit company documents" on public.documents
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Leads update company documents" on public.documents
  for update to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  )
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );

drop policy if exists "Company members see annotations" on public.document_annotations;
drop policy if exists "Leads can annotate" on public.document_annotations;
create policy "Members view document annotations" on public.document_annotations
  for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and private.has_company_role(d.company_id, null)
    )
  );
create policy "Members create document annotations" on public.document_annotations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and private.has_company_role(d.company_id, null)
    )
  );

drop policy if exists "Users see own notifications" on public.notifications;
drop policy if exists "System can create notifications" on public.notifications;
drop policy if exists "Authenticated can create notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users view own notifications" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users update own notifications" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Company leads see invitations" on public.invitations;
drop policy if exists "Invitees see own invitations" on public.invitations;
drop policy if exists "Leads can invite" on public.invitations;
drop policy if exists "Invitees can respond" on public.invitations;
create policy "Leads view company invitations" on public.invitations
  for select to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );
create policy "Invitees view own invitations" on public.invitations
  for select to authenticated
  using (
    lower(email) = lower(coalesce((select email from public.profiles where user_id = (select auth.uid())), ''))
  );
create policy "Leads create company invitations" on public.invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and role <> 'project_lead'::public.app_role
  );

drop policy if exists "Users see own messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Receiver can mark read" on public.messages;
create policy "Participants view company messages" on public.messages
  for select to authenticated
  using (
    (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()))
    and private.has_company_role(company_id, null)
  );
create policy "Members send company messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.has_company_role(company_id, null)
    and private.user_is_company_member(company_id, receiver_id)
  );
create policy "Receivers mark company messages read" on public.messages
  for update to authenticated
  using (
    receiver_id = (select auth.uid())
    and private.has_company_role(company_id, null)
  )
  with check (
    receiver_id = (select auth.uid())
    and private.has_company_role(company_id, null)
  );

drop policy if exists "Project leads see all projects" on public.projects;
drop policy if exists "Team leads see department projects" on public.projects;
drop policy if exists "Members see projects with their tasks" on public.projects;
drop policy if exists "Project leads can insert projects" on public.projects;
drop policy if exists "Project leads can update projects" on public.projects;
drop policy if exists "Project leads can delete projects" on public.projects;
create policy "Project managers view company projects" on public.projects
  for select to authenticated
  using (private.has_company_role(company_id, array['project_lead'::public.app_role]));
create policy "Team leads view department projects" on public.projects
  for select to authenticated
  using (
    private.has_company_role(company_id, array['team_lead'::public.app_role])
    and department = private.membership_department(company_id)
  );
create policy "Contributors view assigned projects" on public.projects
  for select to authenticated
  using (
    private.has_company_role(company_id, array['member'::public.app_role])
    and private.user_has_task_in_project(id)
  );
create policy "Leads create company projects" on public.projects
  for insert to authenticated
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or department = private.membership_department(company_id)
    )
  );
create policy "Leads update company projects" on public.projects
  for update to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or department = private.membership_department(company_id)
    )
  )
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );
create policy "Project managers delete company projects" on public.projects
  for delete to authenticated
  using (private.has_company_role(company_id, array['project_lead'::public.app_role]));

drop policy if exists "Project leads see all tasks" on public.tasks;
drop policy if exists "Team leads see department tasks" on public.tasks;
drop policy if exists "Members see assigned tasks" on public.tasks;
drop policy if exists "Users see tasks they assigned" on public.tasks;
drop policy if exists "Team leads can insert tasks" on public.tasks;
drop policy if exists "Project leads can insert tasks" on public.tasks;
drop policy if exists "Team leads can update tasks" on public.tasks;
drop policy if exists "Project leads can update tasks" on public.tasks;
drop policy if exists "Members can update own tasks" on public.tasks;
drop policy if exists "Project leads can delete tasks" on public.tasks;
drop policy if exists "Users can delete tasks they assigned" on public.tasks;
create policy "Project managers view company tasks" on public.tasks
  for select to authenticated
  using (private.has_company_role(company_id, array['project_lead'::public.app_role]));
create policy "Team leads view department tasks" on public.tasks
  for select to authenticated
  using (
    private.has_company_role(company_id, array['team_lead'::public.app_role])
    and (
      project_id is null
      or private.project_is_in_member_department(project_id, company_id)
    )
  );
create policy "Contributors view assigned tasks" on public.tasks
  for select to authenticated
  using (
    assigned_to = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Assignees view tasks they created" on public.tasks
  for select to authenticated
  using (
    assigned_by = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Leads create company tasks" on public.tasks
  for insert to authenticated
  with check (
    assigned_by = (select auth.uid())
    and private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or project_id is null
      or private.project_is_in_member_department(project_id, company_id)
    )
    and private.user_is_company_member(company_id, assigned_to)
  );
create policy "Leads update company tasks" on public.tasks
  for update to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or project_id is null
      or private.project_is_in_member_department(project_id, company_id)
    )
  )
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );
create policy "Contributors update assigned tasks" on public.tasks
  for update to authenticated
  using (
    assigned_to = (select auth.uid())
    and private.has_company_role(company_id, null)
  )
  with check (
    assigned_to = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Leads delete company tasks" on public.tasks
  for delete to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or assigned_by = (select auth.uid())
    )
  );

drop policy if exists "Members see own submissions" on public.task_submissions;
drop policy if exists "Project leads see all submissions" on public.task_submissions;
drop policy if exists "Team leads see department submissions" on public.task_submissions;
drop policy if exists "Members can submit" on public.task_submissions;
create policy "Members view relevant task submissions" on public.task_submissions
  for select to authenticated
  using (
    submitted_by = (select auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and private.has_company_role(
          t.company_id,
          array['project_lead'::public.app_role, 'team_lead'::public.app_role]
        )
    )
  );
create policy "Contributors submit assigned tasks" on public.task_submissions
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.assigned_to = (select auth.uid())
        and private.has_company_role(t.company_id, null)
    )
  );

-- Atomic company creation avoids orphan companies and direct membership writes.
create or replace function public.create_company(
  _name text,
  _role public.app_role default 'project_lead'::public.app_role,
  _department public.department default null
)
returns public.companies
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid := auth.uid();
  _company public.companies;
begin
  if _user_id is null then
    raise exception 'Authentication required';
  end if;
  if nullif(trim(_name), '') is null then
    raise exception 'Organization name is required';
  end if;
  if _role <> 'project_lead'::public.app_role and _department is null then
    raise exception 'Department is required for this role';
  end if;

  insert into public.companies (name)
  values (trim(_name))
  returning * into _company;

  insert into public.company_memberships (user_id, company_id, role, department)
  values (
    _user_id,
    _company.id,
    _role,
    case when _role = 'project_lead'::public.app_role then null else _department end
  );

  return _company;
end;
$$;

create or replace function public.close_company_workspace(_company_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_company_role(
    _company_id,
    array['project_lead'::public.app_role]
  ) then
    raise exception 'Only active project managers can close a workspace';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id;
end;
$$;

create or replace function public.transfer_role_to_member(
  _company_id uuid,
  _target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
  _caller_department public.department;
  _target_role public.app_role;
begin
  select role, department into _caller_role, _caller_department
  from public.company_memberships
  where company_id = _company_id
    and user_id = auth.uid()
    and is_active = true;

  if _caller_role not in ('project_lead'::public.app_role, 'team_lead'::public.app_role) then
    raise exception 'Only leads can transfer a role';
  end if;
  if _target_user_id = auth.uid() then
    raise exception 'Cannot transfer a role to yourself';
  end if;

  select role into _target_role
  from public.company_memberships
  where company_id = _company_id
    and user_id = _target_user_id
    and is_active = true;

  if _target_role is null then
    raise exception 'Target user is not an active workspace member';
  end if;
  if _caller_role = 'team_lead'::public.app_role and _target_role <> 'member'::public.app_role then
    raise exception 'Team leads can transfer only to contributors';
  end if;

  update public.company_memberships
  set role = _caller_role, department = _caller_department
  where company_id = _company_id and user_id = _target_user_id;

  update public.company_memberships
  set role = 'member'::public.app_role,
      department = coalesce(_caller_department, 'tech'::public.department)
  where company_id = _company_id and user_id = auth.uid();
end;
$$;

create or replace function public.leave_workspace(_company_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
begin
  select role into _caller_role
  from public.company_memberships
  where company_id = _company_id
    and user_id = auth.uid()
    and is_active = true;

  if _caller_role is null then
    raise exception 'You are not an active workspace member';
  end if;
  if _caller_role = 'project_lead'::public.app_role
     and not exists (
       select 1 from public.company_memberships
       where company_id = _company_id
         and user_id <> auth.uid()
         and role = 'project_lead'::public.app_role
         and is_active = true
     ) then
    raise exception 'Transfer the project manager role or delete the organization before leaving';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id and user_id = auth.uid();
end;
$$;

create or replace function public.remove_company_member(
  _company_id uuid,
  _target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
  _target_role public.app_role;
begin
  select role into _caller_role from public.company_memberships
  where company_id = _company_id and user_id = auth.uid() and is_active = true;
  select role into _target_role from public.company_memberships
  where company_id = _company_id and user_id = _target_user_id and is_active = true;

  if _target_user_id = auth.uid() then
    raise exception 'Use leave workspace to remove yourself';
  end if;
  if not (
    (_caller_role = 'project_lead'::public.app_role and _target_role in ('team_lead'::public.app_role, 'member'::public.app_role))
    or (_caller_role = 'team_lead'::public.app_role and _target_role = 'member'::public.app_role)
  ) then
    raise exception 'You do not have permission to remove this member';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id and user_id = _target_user_id;
end;
$$;

create or replace function public.add_company_member(
  _company_id uuid,
  _target_user_id uuid,
  _target_role public.app_role,
  _target_department public.department default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
begin
  select role into _caller_role from public.company_memberships
  where company_id = _company_id and user_id = auth.uid() and is_active = true;

  if not (
    (_caller_role = 'project_lead'::public.app_role and _target_role in ('team_lead'::public.app_role, 'member'::public.app_role))
    or (_caller_role = 'team_lead'::public.app_role and _target_role = 'member'::public.app_role)
  ) then
    raise exception 'You do not have permission to add this member';
  end if;

  update public.company_memberships
  set is_active = true,
      role = _target_role,
      department = _target_department
  where company_id = _company_id
    and user_id = _target_user_id
    and is_active = false;

  if not found then
    raise exception 'User must first join through an invitation or invite code';
  end if;
end;
$$;

create or replace function private.update_project_status_on_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _total integer;
  _done integer;
begin
  if new.project_id is null then
    return new;
  end if;

  select count(*), count(*) filter (
    where status in (
      'completed'::public.task_status,
      'approved'::public.task_status,
      'pending_approval'::public.task_status
    )
  )
  into _total, _done
  from public.tasks
  where project_id = new.project_id;

  if _total > 0 and _done = _total then
    update public.projects set status = 'complete'::public.project_status, progress = 100
    where id = new.project_id;
  elsif _done > 0 then
    update public.projects
    set status = 'in_progress'::public.project_status,
        progress = round((_done::numeric / _total::numeric) * 100)
    where id = new.project_id and status <> 'need_revision'::public.project_status;
  else
    update public.projects set status = 'assigned'::public.project_status, progress = 0
    where id = new.project_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_update_project_on_task_change on public.tasks;
drop trigger if exists update_project_status_on_task_change on public.tasks;
create trigger update_project_status_on_task_change
after insert or update of status on public.tasks
for each row execute function private.update_project_status_on_task_change();

-- Harden the auth profile trigger. Name metadata is display data, never authorization.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), new.email, 'New user'),
    coalesce(new.email, '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- File uploads are private and company-scoped by their first path segment.
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can upload files" on storage.objects;
drop policy if exists "Authenticated users can view files" on storage.objects;
drop policy if exists "Users can update own files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;
create policy "Company members upload project files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );
create policy "Company members view project files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );
create policy "Owners update project files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid()::text)
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  )
  with check (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid()::text)
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );
create policy "Owners delete project files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid()::text)
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );

-- Explicit Data API grants for new-project defaults.
revoke all on table
  public.profiles,
  public.user_roles,
  public.companies,
  public.company_memberships,
  public.announcements,
  public.announcement_reads,
  public.documents,
  public.document_annotations,
  public.notifications,
  public.invitations,
  public.messages,
  public.projects,
  public.tasks,
  public.task_submissions
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, delete on public.companies to authenticated;
grant select on public.company_memberships to authenticated;
grant select, insert on public.announcements to authenticated;
grant select, insert on public.announcement_reads to authenticated;
grant select, insert, update on public.documents to authenticated;
grant select, insert on public.document_annotations to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert on public.invitations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.task_submissions to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_company(text, public.app_role, public.department) to authenticated;
grant execute on function public.close_company_workspace(uuid) to authenticated;
grant execute on function public.transfer_role_to_member(uuid, uuid) to authenticated;
grant execute on function public.leave_workspace(uuid) to authenticated;
grant execute on function public.remove_company_member(uuid, uuid) to authenticated;
grant execute on function public.add_company_member(uuid, uuid, public.app_role, public.department) to authenticated;

-- Realtime is used only for participant-scoped messages.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
