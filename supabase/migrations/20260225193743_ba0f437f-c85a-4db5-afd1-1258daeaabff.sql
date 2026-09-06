-- Add pending_approval to project_status enum
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'pending_approval';