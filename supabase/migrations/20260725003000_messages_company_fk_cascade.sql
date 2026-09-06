-- Older Lovable schema versions created this foreign key without a delete action.
-- Workspace deletion must remove its direct messages with the rest of the company data.

alter table public.messages
  drop constraint if exists messages_company_id_fkey;

alter table public.messages
  add constraint messages_company_id_fkey
  foreign key (company_id)
  references public.companies(id)
  on delete cascade;
