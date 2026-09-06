-- Apply once to the new empty Bells database before bells-restore.sql.
-- Enum definitions only: this transaction creates no tables, grants, or policies.
BEGIN;
CREATE TYPE public.app_role AS ENUM ('project_lead', 'team_lead', 'member');
CREATE TYPE public.department AS ENUM ('tech', 'marketing', 'research');
CREATE TYPE public.project_status AS ENUM ('assigned', 'in_progress', 'complete', 'pending_approval', 'need_revision');
CREATE TYPE public.task_status AS ENUM ('declined', 'approved', 'unchecked', 'incomplete', 'in_progress', 'pending_approval', 'need_revision', 'completed');
COMMIT;
