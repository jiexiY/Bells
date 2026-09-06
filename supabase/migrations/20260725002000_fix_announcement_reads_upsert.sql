-- The frontend marks an announcement read with an upsert so repeated clicks stay idempotent.
-- Upserts require UPDATE permission when the read receipt already exists.

drop policy if exists "Users update own announcement reads" on public.announcement_reads;
create policy "Users update own announcement reads" on public.announcement_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update on public.announcement_reads to authenticated;
