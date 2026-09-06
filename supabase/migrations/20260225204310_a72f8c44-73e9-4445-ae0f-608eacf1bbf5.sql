
-- Add 'need_revision' to project_status enum
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'need_revision';

-- Replace task_status enum with new values
-- First add new values to existing enum
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'incomplete';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'need_revision';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'completed';
