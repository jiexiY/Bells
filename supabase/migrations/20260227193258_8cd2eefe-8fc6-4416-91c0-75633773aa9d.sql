
-- Allow tasks without a project
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;
