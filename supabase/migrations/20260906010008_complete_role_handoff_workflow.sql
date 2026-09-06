-- Complete the manager -> team lead -> contributor review chain.
-- Existing rows are preserved. Privileged commands live in the unexposed private
-- schema and check the authenticated identity, active membership, and target scope.
begin;

alter table public.company_memberships add column if not exists reports_to uuid references auth.users(id) on delete set null;
alter table public.invitations add column if not exists team_lead_id uuid references auth.users(id) on delete set null;
alter table public.tasks add column if not exists review_feedback text;
alter table public.tasks add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.tasks add column if not exists reviewed_at timestamptz;
alter table public.projects add column if not exists review_feedback text;
alter table public.projects add column if not exists submission_comment text;
alter table public.projects add column if not exists reviewed_by uuid references auth.users(id) on delete set null;
alter table public.projects add column if not exists reviewed_at timestamptz;
create index if not exists company_memberships_reports_to_idx on public.company_memberships(company_id,reports_to) where is_active;
create index if not exists invitations_pending_email_idx on public.invitations(company_id,lower(email)) where status='pending';

create table public.work_reviews (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
 task_id uuid references public.tasks(id) on delete cascade, project_id uuid references public.projects(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, action text not null check(action in ('submitted','need_revision','approved')),
 comment text not null default '' check(length(comment)<=4000), created_at timestamptz not null default now(),
 check(num_nonnulls(task_id,project_id)=1)
);
alter table public.work_reviews enable row level security;
create index work_reviews_task_idx on public.work_reviews(task_id,created_at desc);
create index work_reviews_project_idx on public.work_reviews(project_id,created_at desc);
create index work_reviews_company_idx on public.work_reviews(company_id);
create index work_reviews_actor_idx on public.work_reviews(actor_id);
grant select on public.work_reviews to authenticated;
grant all on public.work_reviews to service_role;

create or replace function private.can_access_project(_id uuid, _company uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects p join public.company_memberships m on m.company_id=p.company_id
 where p.id=_id and p.company_id=_company and m.user_id=(select auth.uid()) and m.is_active
 and (m.role='project_lead' or (m.role='team_lead' and p.lead_id=m.user_id)
 or exists(select 1 from public.tasks t where t.project_id=p.id and t.assigned_to=m.user_id)));
$$;
create or replace function private.can_access_task(_id uuid, _company uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.tasks t join public.company_memberships m on m.company_id=t.company_id
 where t.id=_id and t.company_id=_company and m.user_id=(select auth.uid()) and m.is_active
 and (m.role='project_lead' or t.assigned_to=m.user_id or
 (m.role='team_lead' and (t.assigned_by=m.user_id or exists(select 1 from public.projects p where p.id=t.project_id and p.lead_id=m.user_id)))));
$$;
revoke all on function private.can_access_project(uuid,uuid), private.can_access_task(uuid,uuid) from public,anon;
grant execute on function private.can_access_project(uuid,uuid), private.can_access_task(uuid,uuid) to authenticated;

drop policy if exists "Members view permitted company projects" on public.projects;
create policy "Members view permitted company projects" on public.projects for select to authenticated using(private.can_access_project(id,company_id));
drop policy if exists "Members view permitted company tasks" on public.tasks;
create policy "Members view permitted company tasks" on public.tasks for select to authenticated using(private.can_access_task(id,company_id));
drop policy if exists "Leads create company projects" on public.projects;
create policy "Managers create company projects" on public.projects for insert to authenticated with check(private.has_company_role(company_id,array['project_lead']::public.app_role[]));
drop policy if exists "Leads create company tasks" on public.tasks;
create policy "Leads create company tasks" on public.tasks for insert to authenticated with check(
 assigned_by=(select auth.uid()) and private.has_company_role(company_id,array['project_lead','team_lead']::public.app_role[])
 and (private.has_company_role(company_id,array['project_lead']::public.app_role[]) or project_id is null or private.can_access_project(project_id,company_id))
 and (assigned_to is null or private.user_is_company_member(company_id,assigned_to)));
drop policy if exists "Leads delete company tasks" on public.tasks;
create policy "Leads delete company tasks" on public.tasks for delete to authenticated using(
 private.has_company_role(company_id,array['project_lead']::public.app_role[]) or
 (private.has_company_role(company_id,array['team_lead']::public.app_role[]) and assigned_by=(select auth.uid())));
drop policy if exists "Members view relevant task submissions" on public.task_submissions;
create policy "Members view relevant task submissions" on public.task_submissions for select to authenticated using(
 exists(select 1 from public.tasks t where t.id=task_id and private.can_access_task(t.id,t.company_id)));
create policy "Members read reviews for their work" on public.work_reviews for select to authenticated using(
 (task_id is not null and private.can_access_task(task_id,company_id)) or
 (project_id is not null and private.can_access_project(project_id,company_id)));

-- Browser writes cannot bypass the validated state transitions below.
revoke update on public.tasks,public.projects from authenticated;
revoke insert,update,delete on public.task_submissions from authenticated;

create or replace function private.validate_work_creation() returns trigger
language plpgsql security definer set search_path='' as $$
declare _member public.company_memberships; _lead uuid;
begin
 if auth.uid() is null then return new; end if;
 select * into _member from public.company_memberships where company_id=new.company_id and user_id=auth.uid() and is_active;
 if not found then raise exception 'Active workspace membership required'; end if;
 if tg_table_name='projects' then
  if _member.role<>'project_lead' then raise exception 'Only project managers create projects'; end if;
  if new.status<>'assigned' or new.progress<>0 then raise exception 'New projects start assigned at 0 percent'; end if;
  if new.lead_id is not null and not exists(select 1 from public.company_memberships where company_id=new.company_id and user_id=new.lead_id and role='team_lead' and is_active)
   then raise exception 'Choose an active team lead in this workspace'; end if;
 else
  if _member.role not in ('project_lead','team_lead') or new.assigned_by is distinct from auth.uid() then raise exception 'Only leads assign work'; end if;
  if new.status not in ('incomplete','unchecked') then raise exception 'New tasks start incomplete'; end if;
  if new.project_id is not null then
   select lead_id into _lead from public.projects where id=new.project_id and company_id=new.company_id and status not in ('complete','pending_approval');
   if not found then raise exception 'Choose an open project in this workspace'; end if;
   if _member.role='team_lead' and _lead is distinct from auth.uid() then raise exception 'This project belongs to another team lead'; end if;
  end if;
  if new.assigned_to is not null then
   if not exists(select 1 from public.company_memberships where company_id=new.company_id and user_id=new.assigned_to and is_active
    and (_member.role='project_lead' or (role='member' and reports_to=auth.uid()))) then raise exception 'Choose a contributor from your team'; end if;
  end if;
 end if;
 return new;
end; $$;
revoke all on function private.validate_work_creation() from public,anon,authenticated;
create trigger validate_project_creation before insert on public.projects for each row execute function private.validate_work_creation();
create trigger validate_task_creation before insert on public.tasks for each row execute function private.validate_work_creation();

-- Task approval drives progress; it never substitutes for the PM's project review.
create or replace function private.update_project_status_on_task_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare _project uuid; _total integer; _done integer; _started integer;
begin
 _project := case when tg_op='DELETE' then old.project_id else new.project_id end;
 if _project is null then return coalesce(new,old); end if;
 select count(*),count(*) filter(where status in ('completed','approved')),count(*) filter(where status not in ('unchecked','incomplete'))
 into _total,_done,_started from public.tasks where project_id=_project;
 update public.projects set progress=case when _total=0 then 0 else round(100.0*_done/_total) end,
 status=case when status in ('complete','pending_approval') and (_total=0 or _done<_total) then 'in_progress'::public.project_status
 when status='assigned' and _started>0 then 'in_progress'::public.project_status else status end where id=_project;
 return coalesce(new,old);
end; $$;
drop trigger if exists update_project_status_on_task_change on public.tasks;
create trigger update_project_status_on_task_change after insert or update or delete on public.tasks for each row execute function private.update_project_status_on_task_change();

create or replace function private.update_task_workflow(_task_id uuid,_updates jsonb) returns public.tasks
language plpgsql security definer set search_path='' as $$
declare _task public.tasks; _member public.company_memberships; _status public.task_status;
 _feedback text:=coalesce(_updates->>'review_feedback',''); _comment text:=coalesce(_updates->>'comment','');
 _type text:=coalesce(_updates->>'submission_type','none'); _url text:=nullif(trim(_updates->>'submission_url'),'');
 _file text:=nullif(_updates->>'submission_file_url',''); _attempt integer; _lead uuid; _reviewer boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(_updates)<>'object' or exists(select 1 from jsonb_object_keys(_updates) k where k not in ('status','review_feedback','comment','submission_type','submission_url','submission_file_url')) then raise exception 'Unsupported task update'; end if;
 select * into _task from public.tasks where id=_task_id for update;
 if not found then raise exception 'Task unavailable'; end if;
 select * into _member from public.company_memberships where company_id=_task.company_id and user_id=auth.uid() and is_active;
 if not found then raise exception 'Active workspace membership required'; end if;
 select lead_id into _lead from public.projects where id=_task.project_id;
 _reviewer := _task.assigned_to is distinct from auth.uid() and (_member.role='project_lead' or
  (_member.role='team_lead' and (_lead=auth.uid() or (_task.project_id is null and _task.assigned_by=auth.uid()))));
 _status:=(_updates->>'status')::public.task_status;
 if _status is null then raise exception 'Task status required'; end if;
 if length(_feedback)>4000 or length(_comment)>4000 then raise exception 'Comments must be 4000 characters or fewer'; end if;
 if _status in ('completed','approved','need_revision') then
  if not coalesce(_reviewer,false) then raise exception 'Only the responsible reviewer can review this task'; end if;
  if _task.status<>'pending_approval' then raise exception 'The task must be submitted before review'; end if;
  if _status='need_revision' and nullif(trim(_feedback),'') is null then raise exception 'Explain what needs revision'; end if;
  update public.tasks set status=_status,review_feedback=trim(_feedback),reviewed_by=auth.uid(),reviewed_at=now() where id=_task_id returning * into _task;
  insert into public.work_reviews(company_id,task_id,actor_id,action,comment) values(_task.company_id,_task_id,auth.uid(),case when _status='need_revision' then 'need_revision' else 'approved' end,trim(_feedback));
 elsif _status in ('in_progress','pending_approval') then
  if _task.assigned_to is distinct from auth.uid() then raise exception 'Only the assignee can start or submit this task'; end if;
  if _task.status in ('completed','approved','pending_approval') then raise exception 'This task is already submitted or approved'; end if;
  if _status='pending_approval' then
   if _type not in ('none','file','link') then raise exception 'Choose a valid submission type'; end if;
   if _type='link' and (_url is null or _url !~ '^https?://[^[:space:]]+$') then raise exception 'Enter a valid HTTP or HTTPS link'; end if;
   if _type='file' and (_file is null or _file not like _task.company_id::text||'/submissions/'||_task_id::text||'/%') then raise exception 'Invalid submission file path'; end if;
   if _type='file' and not exists(select 1 from storage.objects where bucket_id='project-files' and name=_file and owner_id=auth.uid()::text) then raise exception 'Upload your own submission file first'; end if;
   select coalesce(max(attempt_number),0)+1 into _attempt from public.task_submissions where task_id=_task_id;
   insert into public.task_submissions(task_id,submitted_by,submission_type,submission_url,submission_file_url,comment,attempt_number)
    values(_task_id,auth.uid(),_type,case when _type='link' then _url end,case when _type='file' then _file end,nullif(trim(_comment),''),_attempt);
   update public.tasks set status=_status,submission_type=_type,submission_url=case when _type='link' then _url end,submission_file_url=case when _type='file' then _file end where id=_task_id returning * into _task;
   insert into public.work_reviews(company_id,task_id,actor_id,action,comment) values(_task.company_id,_task_id,auth.uid(),'submitted',trim(_comment));
  else update public.tasks set status=_status where id=_task_id returning * into _task;
  end if;
 else raise exception 'Unsupported task transition'; end if;
 return _task;
end; $$;
create or replace function public.update_task_workflow(_task_id uuid,_updates jsonb) returns public.tasks
language sql security invoker set search_path='' as $$ select private.update_task_workflow(_task_id,_updates); $$;

create or replace function private.update_project_workflow(_project_id uuid,_updates jsonb) returns public.projects
language plpgsql security definer set search_path='' as $$
declare _project public.projects; _member public.company_memberships; _status public.project_status; _comment text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if jsonb_typeof(_updates)<>'object' or exists(select 1 from jsonb_object_keys(_updates) k where k not in ('status','review_feedback','submission_comment')) then raise exception 'Unsupported project update'; end if;
 select * into _project from public.projects where id=_project_id for update;
 if not found then raise exception 'Project unavailable'; end if;
 select * into _member from public.company_memberships where company_id=_project.company_id and user_id=auth.uid() and is_active;
 if not found then raise exception 'Active workspace membership required'; end if;
 _status:=(_updates->>'status')::public.project_status;
 if _status='pending_approval' then
  if _member.role<>'team_lead' or _project.lead_id is distinct from auth.uid() then raise exception 'Only the assigned team lead submits this project'; end if;
  if _project.status in ('complete','pending_approval') then raise exception 'Project already submitted or approved'; end if;
  if not exists(select 1 from public.tasks where project_id=_project_id) or exists(select 1 from public.tasks where project_id=_project_id and status not in ('completed','approved')) then raise exception 'Approve every project task before submitting the project'; end if;
  _comment:=trim(coalesce(_updates->>'submission_comment',''));
  if length(_comment)>4000 then raise exception 'Comments must be 4000 characters or fewer'; end if;
  update public.projects set status=_status,submission_comment=_comment where id=_project_id returning * into _project;
  insert into public.work_reviews(company_id,project_id,actor_id,action,comment) values(_project.company_id,_project_id,auth.uid(),'submitted',_comment);
 elsif _status in ('complete','need_revision') then
  if _member.role<>'project_lead' then raise exception 'Only the project manager can review projects'; end if;
  if _project.status<>'pending_approval' then raise exception 'The team lead must submit the project first'; end if;
  _comment:=trim(coalesce(_updates->>'review_feedback',''));
  if length(_comment)>4000 then raise exception 'Comments must be 4000 characters or fewer'; end if;
  if _status='need_revision' and _comment='' then raise exception 'Explain what needs revision'; end if;
  if _status='complete' and (not exists(select 1 from public.tasks where project_id=_project_id) or exists(select 1 from public.tasks where project_id=_project_id and status not in ('completed','approved'))) then raise exception 'All project tasks must be approved'; end if;
  update public.projects set status=_status,review_feedback=_comment,reviewed_by=auth.uid(),reviewed_at=now() where id=_project_id returning * into _project;
  insert into public.work_reviews(company_id,project_id,actor_id,action,comment) values(_project.company_id,_project_id,auth.uid(),case when _status='complete' then 'approved' else 'need_revision' end,_comment);
 else raise exception 'Unsupported project transition'; end if;
 return _project;
end; $$;
create or replace function public.update_project_workflow(_project_id uuid,_updates jsonb) returns public.projects
language sql security invoker set search_path='' as $$ select private.update_project_workflow(_project_id,_updates); $$;

-- Invitations preserve a PM-approved lead role and the contributor's chosen team.
create or replace function private.validate_work_invitation() returns trigger
language plpgsql security definer set search_path='' as $$
declare _member public.company_memberships; _lead public.company_memberships;
begin
 if auth.uid() is null then return new; end if;
 select * into _member from public.company_memberships where company_id=new.company_id and user_id=auth.uid() and is_active;
 if not found or _member.role not in ('project_lead','team_lead') or new.invited_by is distinct from auth.uid() then raise exception 'Only active leads invite members'; end if;
 new.email:=lower(trim(new.email));
 if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(new.email)>254 then raise exception 'Enter a valid email'; end if;
 if new.status<>'pending' or new.role='project_lead' then raise exception 'Invalid invitation role or status'; end if;
 if new.role='team_lead' then
  if _member.role<>'project_lead' then raise exception 'Only project managers invite team leads'; end if;
  if new.department is null then raise exception 'Choose the team lead department'; end if;
  new.team_lead_id:=null;
 else
  if _member.role='team_lead' then new.team_lead_id:=auth.uid(); new.department:=_member.department; end if;
  if new.team_lead_id is null then raise exception 'Choose the contributor team lead'; end if;
  select * into _lead from public.company_memberships where company_id=new.company_id and user_id=new.team_lead_id and role='team_lead' and is_active;
  if not found then raise exception 'Choose an active team lead'; end if;
  new.department:=_lead.department;
 end if;
 -- Lock the company so simultaneous invitations cannot create duplicate pending rows.
 perform 1 from public.companies where id=new.company_id for update;
 if exists(select 1 from public.invitations where company_id=new.company_id and lower(email)=new.email and status='pending') then raise exception 'An invitation is already pending for this email'; end if;
 return new;
end; $$;
revoke all on function private.validate_work_invitation() from public,anon,authenticated;
create trigger validate_work_invitation before insert on public.invitations for each row execute function private.validate_work_invitation();

create or replace function private.respond_work_invitation(_invitation_id uuid,_accept boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare _invite public.invitations; _email text; _existing public.company_memberships;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select lower(email) into _email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into _invite from public.invitations where id=_invitation_id and lower(email)=_email for update;
 if not found then raise exception 'Invitation unavailable for this signed-in email'; end if;
 if _invite.status<>'pending' then raise exception 'This invitation has already been answered'; end if;
 if _accept is null then raise exception 'Choose accept or decline'; end if;
 if _accept then
  if not exists(select 1 from public.company_memberships where company_id=_invite.company_id and user_id=_invite.invited_by and is_active
   and (role='project_lead' or (role='team_lead' and _invite.role='member' and _invite.team_lead_id=user_id))) then raise exception 'Ask your manager for a new invitation'; end if;
  if _invite.role='project_lead' then raise exception 'Manager roles require role transfer'; end if;
  if _invite.role='member' and (_invite.team_lead_id is null or not exists(select 1 from public.company_memberships where company_id=_invite.company_id and user_id=_invite.team_lead_id and role='team_lead' and is_active)) then raise exception 'Ask the manager for an invitation with an active team lead'; end if;
  select * into _existing from public.company_memberships where company_id=_invite.company_id and user_id=auth.uid() for update;
  if found and _existing.is_active then raise exception 'You already belong to this workspace'; end if;
  insert into public.company_memberships(company_id,user_id,role,department,is_active,reports_to)
   values(_invite.company_id,auth.uid(),_invite.role,_invite.department,true,_invite.team_lead_id)
   on conflict(user_id,company_id) do update set role=excluded.role,department=excluded.department,is_active=true,reports_to=excluded.reports_to;
 end if;
 update public.invitations set status=case when _accept then 'accepted' else 'declined' end,responded_at=now() where id=_invitation_id;
 return _invite.company_id;
end; $$;
create or replace function public.respond_work_invitation(_invitation_id uuid,_accept boolean) returns uuid
language sql security invoker set search_path='' as $$ select private.respond_work_invitation(_invitation_id,_accept); $$;

create or replace function private.join_workplace(_invite_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare _company public.companies; _invite uuid; _member public.company_memberships; _email text;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into _company from public.companies where invite_code=upper(trim(_invite_code));
 if not found then raise exception 'Invalid workplace code'; end if;
 select * into _member from public.company_memberships where company_id=_company.id and user_id=auth.uid() and is_active;
 if not found then
  select lower(email) into _email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  select id into _invite from public.invitations where company_id=_company.id and lower(email)=_email and status='pending' order by created_at desc limit 1;
  if _invite is null then raise exception 'Ask your manager or team lead to invite your signed-in email first'; end if;
  perform private.respond_work_invitation(_invite,true);
  select * into _member from public.company_memberships where company_id=_company.id and user_id=auth.uid() and is_active;
 end if;
 return jsonb_build_object('company_id',_company.id,'company_name',_company.name,'role',_member.role,'department',_member.department);
end; $$;
create or replace function public.join_workplace(_invite_code text) returns jsonb
language sql security invoker set search_path='' as $$ select private.join_workplace(_invite_code); $$;

revoke all on function private.update_task_workflow(uuid,jsonb),private.update_project_workflow(uuid,jsonb),private.respond_work_invitation(uuid,boolean),private.join_workplace(text) from public,anon;
revoke all on function public.update_task_workflow(uuid,jsonb),public.update_project_workflow(uuid,jsonb),public.respond_work_invitation(uuid,boolean),public.join_workplace(text) from public,anon;
grant execute on function private.update_task_workflow(uuid,jsonb),private.update_project_workflow(uuid,jsonb),private.respond_work_invitation(uuid,boolean),private.join_workplace(text) to authenticated;
grant execute on function public.update_task_workflow(uuid,jsonb),public.update_project_workflow(uuid,jsonb),public.respond_work_invitation(uuid,boolean),public.join_workplace(text) to authenticated;
comment on function public.join_workplace(text) is 'Joins only an existing invitation matching the authenticated and verified email. Shared codes never self-assign a role.';
comment on table public.work_reviews is 'Immutable submission and review history. Written only by authenticated, scope-checked workflow functions.';
commit;
