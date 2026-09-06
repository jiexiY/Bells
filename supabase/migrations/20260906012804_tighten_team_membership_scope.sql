begin;
-- Preserve team membership and role when reactivating a person. A lead manages only their own contributors.
create or replace function public.add_company_member(_company_id uuid,_target_user_id uuid,_target_role public.app_role,_target_department public.department default null)
returns void language plpgsql security definer set search_path='' as $$
declare caller public.company_memberships; target public.company_memberships;
begin
 select * into caller from public.company_memberships where company_id=_company_id and user_id=auth.uid() and is_active;
 select * into target from public.company_memberships where company_id=_company_id and user_id=_target_user_id for update;
 if target.id is null or target.is_active then raise exception 'This member cannot be reactivated'; end if;
 if (caller.role='project_lead' and target.role in ('team_lead','member') or caller.role='team_lead' and target.role='member' and target.reports_to=auth.uid()) is not true then raise exception 'You can only manage members assigned to your role'; end if;
 if target.role is distinct from _target_role or target.department is distinct from _target_department then raise exception 'Use a new invitation to change a member role or team'; end if;
 update public.company_memberships set is_active=true where id=target.id;
end $$;
create or replace function public.remove_company_member(_company_id uuid,_target_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare caller public.company_memberships; target public.company_memberships;
begin
 select * into caller from public.company_memberships where company_id=_company_id and user_id=auth.uid() and is_active;
 select * into target from public.company_memberships where company_id=_company_id and user_id=_target_user_id and is_active for update;
 if _target_user_id=auth.uid() then raise exception 'Use leave workspace to remove yourself'; end if;
 if (caller.role='project_lead' and target.role in ('team_lead','member') or caller.role='team_lead' and target.role='member' and target.reports_to=auth.uid()) is not true then raise exception 'You can only manage members assigned to your role'; end if;
 update public.company_memberships set is_active=false where id=target.id;
end $$;
-- Supabase default grants included write privileges; retain only the intended read access.
revoke all on public.work_reviews from anon,authenticated;
grant select on public.work_reviews to authenticated;
-- Creation no longer requests INSERT RETURNING. Restore stable read snapshots.
alter function private.can_access_project(uuid,uuid) stable;
alter function private.can_access_task(uuid,uuid) stable;
commit;
