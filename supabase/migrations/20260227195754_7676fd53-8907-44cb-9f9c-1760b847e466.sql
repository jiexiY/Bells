-- Add submission columns to tasks table for the submit-for-approval workflow
ALTER TABLE public.tasks
ADD COLUMN submission_type text DEFAULT NULL,
ADD COLUMN submission_url text DEFAULT NULL,
ADD COLUMN submission_file_url text DEFAULT NULL;

-- submission_type can be: 'file', 'link', 'none' (no attachment)
