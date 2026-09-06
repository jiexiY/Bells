begin;
-- These checks must see rows created by the calling INSERT ... RETURNING.
-- VOLATILE refreshes their snapshot without changing any access predicate.
alter function private.can_access_project(uuid, uuid) volatile;
alter function private.can_access_task(uuid, uuid) volatile;
commit;
