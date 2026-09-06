
-- Add invite_code to companies table
ALTER TABLE public.companies
ADD COLUMN invite_code text NOT NULL DEFAULT upper(substr(md5((gen_random_uuid())::text), 1, 8));

-- Make it unique
ALTER TABLE public.companies ADD CONSTRAINT companies_invite_code_key UNIQUE (invite_code);

-- Remove invite_code from projects table
ALTER TABLE public.projects DROP COLUMN invite_code;
