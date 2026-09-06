-- Bells clean-backend restoration for the new project.
-- Apply bells-enums.sql first. Execute this complete file as ONE transaction.
-- Original broad policies are created and superseded only within this transaction;
-- they are never committed as an externally usable intermediate state.
-- Source includes the 35 Feb-Mar schema migrations and four production fixes.
-- Excludes 20260725031841: it references undefined legacy helpers and reverses newer policy choices.
BEGIN;
-- Source: 20260209162503_f37e67a8-39fa-4d11-8e59-d6a2e2a42e9e.sql

-- Enums
-- Final enum definition is committed by bells-enums.sql.
-- Final enum definition is committed by bells-enums.sql.
-- Final enum definition is committed by bells-enums.sql.
-- Final enum definition is committed by bells-enums.sql.

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department public.department,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  department public.department,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS public.department LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE POLICY "Anyone authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Projects (no member policy yet — tasks table needed first)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'assigned',
  progress INT NOT NULL DEFAULT 0,
  lead_id UUID REFERENCES auth.users(id),
  lead_name TEXT,
  department public.department NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project leads see all projects" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'project_lead'));
CREATE POLICY "Team leads see department projects" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'team_lead') AND department = public.get_user_department(auth.uid()));
CREATE POLICY "Project leads can insert projects" ON public.projects FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'project_lead'));
CREATE POLICY "Project leads can update projects" ON public.projects FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'project_lead'));
CREATE POLICY "Project leads can delete projects" ON public.projects FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'project_lead'));

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status public.task_status NOT NULL DEFAULT 'unchecked',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assignee_name TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project leads see all tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'project_lead'));
CREATE POLICY "Team leads see department tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'team_lead') AND project_id IN (SELECT id FROM public.projects WHERE department = public.get_user_department(auth.uid())));
CREATE POLICY "Members see assigned tasks" ON public.tasks FOR SELECT TO authenticated
  USING (assigned_to = auth.uid());
CREATE POLICY "Team leads can insert tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'team_lead') AND project_id IN (SELECT id FROM public.projects WHERE department = public.get_user_department(auth.uid())));
CREATE POLICY "Team leads can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'team_lead') AND project_id IN (SELECT id FROM public.projects WHERE department = public.get_user_department(auth.uid())));
CREATE POLICY "Project leads can update tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'project_lead'));

-- Now add member policy on projects (tasks exists now)
CREATE POLICY "Members see projects with their tasks" ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'member') AND id IN (SELECT project_id FROM public.tasks WHERE assigned_to = auth.uid()));

-- Triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Source: 20260211200003_6008f680-4edd-49a3-bc9a-97ded668bbe4.sql

-- Companies table for multi-company portal
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Company memberships
CREATE TABLE public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  department department,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- Announcements for communication
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  created_by uuid NOT NULL,
  target_role app_role,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Read receipts for announcements
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Documents for submission/review workflow
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint DEFAULT 0,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'revision_needed', 'completed')),
  submitted_by uuid NOT NULL,
  submitted_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Document annotations for inline review
CREATE TABLE public.document_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  content text NOT NULL,
  page_number integer,
  position_x float,
  position_y float,
  highlight_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

-- Notifications table for all notification types
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('announcement', 'document_review', 'document_revision', 'task_assigned', 'read_receipt')),
  title text NOT NULL,
  message text,
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies: users can see companies they belong to
CREATE POLICY "Users see their companies" ON public.companies FOR SELECT
  USING (id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated can create companies" ON public.companies FOR INSERT
  WITH CHECK (true);

-- Company memberships
CREATE POLICY "Users see own memberships" ON public.company_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can join companies" ON public.company_memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own membership" ON public.company_memberships FOR UPDATE
  USING (user_id = auth.uid());

-- Announcements: users in the company can see
CREATE POLICY "Company members see announcements" ON public.announcements FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Leads can create announcements" ON public.announcements FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'project_lead') OR has_role(auth.uid(), 'team_lead')));

-- Announcement reads
CREATE POLICY "Users manage own reads" ON public.announcement_reads FOR SELECT
  USING (user_id = auth.uid() OR announcement_id IN (
    SELECT id FROM public.announcements WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can mark read" ON public.announcement_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Documents
CREATE POLICY "Company members see documents" ON public.documents FOR SELECT
  USING (company_id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Members can submit documents" ON public.documents FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()));

CREATE POLICY "Leads can update documents" ON public.documents FOR UPDATE
  USING (company_id IN (SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'project_lead') OR has_role(auth.uid(), 'team_lead') OR submitted_by = auth.uid()));

-- Document annotations
CREATE POLICY "Company members see annotations" ON public.document_annotations FOR SELECT
  USING (document_id IN (SELECT id FROM public.documents WHERE company_id IN (
    SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()
  )));

CREATE POLICY "Leads can annotate" ON public.document_annotations FOR INSERT
  WITH CHECK (document_id IN (SELECT id FROM public.documents WHERE company_id IN (
    SELECT company_id FROM public.company_memberships WHERE user_id = auth.uid()
  )));

-- Notifications
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for documents updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', true);

CREATE POLICY "Authenticated users can upload files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view files" ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');


-- Source: 20260212030320_9c50b812-c37c-4656-bf12-9bfbee3ebd09.sql

-- Fix overly permissive policies
DROP POLICY "Authenticated can create companies" ON public.companies;
CREATE POLICY "Authenticated can create companies" ON public.companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- Source: 20260213201759_6b6e6165-d9cf-4366-99dc-de2dfc32b26c.sql

-- Create invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'member',
  department public.department NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  responded_at timestamp with time zone NULL
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Company members (leads) can see invitations for their company
CREATE POLICY "Company leads see invitations"
ON public.invitations FOR SELECT
USING (
  company_id IN (
    SELECT cm.company_id FROM company_memberships cm
    WHERE cm.user_id = auth.uid()
  )
);

-- Invitees can see their own invitations by email
CREATE POLICY "Invitees see own invitations"
ON public.invitations FOR SELECT
USING (
  email IN (
    SELECT p.email FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- Leads can create invitations
CREATE POLICY "Leads can invite"
ON public.invitations FOR INSERT
WITH CHECK (
  invited_by = auth.uid()
  AND company_id IN (
    SELECT cm.company_id FROM company_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.role IN ('project_lead', 'team_lead')
  )
);

-- Invitees can update (accept/decline) their own invitations
CREATE POLICY "Invitees can respond"
ON public.invitations FOR UPDATE
USING (
  email IN (
    SELECT p.email FROM profiles p WHERE p.user_id = auth.uid()
  )
);


-- Source: 20260214051402_e0e42fda-6a50-4e98-97db-e23521c058a2.sql
-- Allow authenticated users to see all companies (needed for invitations and newly created companies)
-- Drop the restrictive policy and replace with a broader one
DROP POLICY IF EXISTS "Users see their companies" ON public.companies;

CREATE POLICY "Authenticated users can see companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- Source: 20260225191027_88e3b7ea-a245-431f-95a3-492525450a20.sql

-- Add profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS avatar_url text;


-- Source: 20260225191454_0409bb30-9d8a-49e1-8a90-30bf8c5eec14.sql

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: sender or receiver can see
CREATE POLICY "Users see own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- INSERT: sender_id must match auth.uid()
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- UPDATE: receiver can mark as read
CREATE POLICY "Receiver can mark read"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- Source: 20260225193743_ba0f437f-c85a-4db5-afd1-1258daeaabff.sql
-- Add pending_approval to project_status enum
-- Final enum value is committed by bells-enums.sql.

-- Source: 20260225194522_d86e5b5d-21e6-41de-bfe3-07f75a198864.sql
-- Add invite_code column to projects
ALTER TABLE public.projects ADD COLUMN invite_code text UNIQUE;

-- Generate unique invite codes for all existing projects
UPDATE public.projects
SET invite_code = upper(substr(md5(id::text || random()::text), 1, 8))
WHERE invite_code IS NULL;

-- Make it not-null going forward with a default
ALTER TABLE public.projects ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(gen_random_uuid()::text), 1, 8));
ALTER TABLE public.projects ALTER COLUMN invite_code SET NOT NULL;

-- Create a table to track who joined via invite code
CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see project members for projects they belong to
CREATE POLICY "Members see project members"
  ON public.project_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- Allow inserts via service role (edge function)
CREATE POLICY "Service role can insert members"
  ON public.project_members FOR INSERT
  WITH CHECK (true);

-- Allow project leads to view invite codes
CREATE POLICY "Leads can view invite codes"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'project_lead'::app_role)
    OR has_role(auth.uid(), 'team_lead'::app_role)
    OR id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid())
  );

-- Source: 20260225194618_87db1e05-7ca6-4a7d-9056-a5c82c9baa0c.sql
-- Fix: Tighten insert policy to require authenticated user and own user_id
DROP POLICY "Service role can insert members" ON public.project_members;

CREATE POLICY "Authenticated can join projects"
  ON public.project_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Source: 20260225194953_d149eba3-b89a-4e98-a5f3-581d2e52764c.sql
-- Remove the redundant policy that may cause issues (existing policies already cover leads)
DROP POLICY IF EXISTS "Leads can view invite codes" ON public.projects;

-- Source: 20260225195153_356c9c8d-40b0-4dac-9bbe-92078434db40.sql
-- Fix infinite recursion: replace the "Members see projects with their tasks" policy
-- with a security definer function that avoids cross-table policy evaluation

CREATE OR REPLACE FUNCTION public.user_has_tasks_in_project(_user_id uuid, _project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE assigned_to = _user_id AND project_id = _project_id
  )
$$;

-- Drop the problematic policy and recreate with the function
DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;

CREATE POLICY "Members see projects with their tasks"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'member'::app_role)
    AND user_has_tasks_in_project(auth.uid(), id)
  );

-- Source: 20260225195228_c019436d-68ee-4f20-a7f8-b60d95cc0f44.sql
-- Create a security definer function to check project department without triggering projects RLS
CREATE OR REPLACE FUNCTION public.project_has_department(_project_id uuid, _department department)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND department = _department
  )
$$;

-- Fix tasks policies that cause recursion by referencing projects table
DROP POLICY IF EXISTS "Team leads see department tasks" ON public.tasks;
CREATE POLICY "Team leads see department tasks"
  ON public.tasks FOR SELECT
  USING (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND project_has_department(project_id, get_user_department(auth.uid()))
  );

DROP POLICY IF EXISTS "Team leads can insert tasks" ON public.tasks;
CREATE POLICY "Team leads can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND project_has_department(project_id, get_user_department(auth.uid()))
  );

DROP POLICY IF EXISTS "Team leads can update tasks" ON public.tasks;
CREATE POLICY "Team leads can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND project_has_department(project_id, get_user_department(auth.uid()))
  );

-- Also fix "Team leads see department projects" on projects table
DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
CREATE POLICY "Team leads see department projects"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'team_lead'::app_role)
    AND department = get_user_department(auth.uid())
  );

-- Source: 20260225200102_ba66db21-7264-41b5-8305-a9f6da86604c.sql

-- Add invite_code to companies table
ALTER TABLE public.companies
ADD COLUMN invite_code text NOT NULL DEFAULT upper(substr(md5((gen_random_uuid())::text), 1, 8));

-- Make it unique
ALTER TABLE public.companies ADD CONSTRAINT companies_invite_code_key UNIQUE (invite_code);

-- Remove invite_code from projects table
ALTER TABLE public.projects DROP COLUMN invite_code;


-- Source: 20260225204310_a72f8c44-73e9-4445-ae0f-608eacf1bbf5.sql

-- Add 'need_revision' to project_status enum
-- Final enum value is committed by bells-enums.sql.

-- Replace task_status enum with new values
-- First add new values to existing enum
-- Final enum value is committed by bells-enums.sql.
-- Final enum value is committed by bells-enums.sql.
-- Final enum value is committed by bells-enums.sql.
-- Final enum value is committed by bells-enums.sql.
-- Final enum value is committed by bells-enums.sql.


-- Source: 20260227185733_04b0fe38-3ae6-4193-8d66-af25580cc7af.sql

-- Create trigger to auto-insert user_roles from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert if role metadata is provided
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, department)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'role')::app_role,
      CASE WHEN NEW.raw_user_meta_data->>'department' IS NOT NULL 
           THEN (NEW.raw_user_meta_data->>'department')::department 
           ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_role();


-- Source: 20260227192337_0d8277c8-2b1f-49f8-ac07-1b2b5594161e.sql

-- Drop existing insert policy
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;

-- Create new insert policy that checks both user_roles and company_memberships
CREATE POLICY "Project leads can insert projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead') 
  OR EXISTS (
    SELECT 1 FROM public.company_memberships 
    WHERE user_id = auth.uid() 
    AND role IN ('project_lead', 'team_lead')
  )
);


-- Source: 20260227192907_232b15a3-0766-4da6-9757-d223fcb8250b.sql

-- Create a security definer function to check company membership role
CREATE OR REPLACE FUNCTION public.has_company_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id
    AND role = ANY(_roles)
  )
$$;

-- Drop and recreate the insert policy using the security definer function
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;

CREATE POLICY "Project leads can insert projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead') 
  OR has_company_role(auth.uid(), ARRAY['project_lead', 'team_lead']::app_role[])
);


-- Source: 20260227193258_8cd2eefe-8fc6-4416-91c0-75633773aa9d.sql

-- Allow tasks without a project
ALTER TABLE public.tasks ALTER COLUMN project_id DROP NOT NULL;


-- Source: 20260227193339_ed635f72-42d5-43b5-bb41-c145b9455a21.sql

-- Update team lead task policies to handle null project_id
DROP POLICY IF EXISTS "Team leads can insert tasks" ON public.tasks;
CREATE POLICY "Team leads can insert tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'team_lead') AND (
    project_id IS NULL 
    OR project_has_department(project_id, get_user_department(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Team leads can update tasks" ON public.tasks;
CREATE POLICY "Team leads can update tasks" ON public.tasks
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'team_lead') AND (
    project_id IS NULL 
    OR project_has_department(project_id, get_user_department(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Team leads see department tasks" ON public.tasks;
CREATE POLICY "Team leads see department tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'team_lead') AND (
    project_id IS NULL 
    OR project_has_department(project_id, get_user_department(auth.uid()))
  )
);

-- Also allow project leads to insert tasks
DROP POLICY IF EXISTS "Project leads can insert tasks" ON public.tasks;
CREATE POLICY "Project leads can insert tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead')
  OR has_company_role(auth.uid(), ARRAY['project_lead']::app_role[])
);


-- Source: 20260227195310_f833bac9-0072-4338-8b6f-219f5a6f16b0.sql
-- Fix: Change SELECT policies from RESTRICTIVE to PERMISSIVE
-- Currently all are RESTRICTIVE which means ALL must pass (AND logic)
-- They should be PERMISSIVE so ANY can grant access (OR logic)

DROP POLICY IF EXISTS "Project leads see all projects" ON public.projects;
CREATE POLICY "Project leads see all projects" ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'project_lead'));

DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
CREATE POLICY "Team leads see department projects" ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_lead') AND department = get_user_department(auth.uid()));

DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;
CREATE POLICY "Members see projects with their tasks" ON public.projects
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'member') AND user_has_tasks_in_project(auth.uid(), id));

-- Also fix INSERT, UPDATE, DELETE policies to be PERMISSIVE
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;
CREATE POLICY "Project leads can insert projects" ON public.projects
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'project_lead') OR has_company_role(auth.uid(), ARRAY['project_lead'::app_role, 'team_lead'::app_role]));

DROP POLICY IF EXISTS "Project leads can update projects" ON public.projects;
CREATE POLICY "Project leads can update projects" ON public.projects
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'project_lead'));

DROP POLICY IF EXISTS "Project leads can delete projects" ON public.projects;
CREATE POLICY "Project leads can delete projects" ON public.projects
FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'project_lead'));

-- Source: 20260227195754_7676fd53-8907-44cb-9f9c-1760b847e466.sql
-- Add submission columns to tasks table for the submit-for-approval workflow
ALTER TABLE public.tasks
ADD COLUMN submission_type text DEFAULT NULL,
ADD COLUMN submission_url text DEFAULT NULL,
ADD COLUMN submission_file_url text DEFAULT NULL;

-- submission_type can be: 'file', 'link', 'none' (no attachment)


-- Source: 20260227201219_a642ffbb-e4e6-404a-b211-16f3ace435f3.sql

CREATE OR REPLACE FUNCTION public.update_project_status_on_task_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_tasks INTEGER;
  done_tasks INTEGER;
BEGIN
  -- Only process if task has a project
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('completed', 'approved', 'pending_approval'))
  INTO total_tasks, done_tasks
  FROM public.tasks
  WHERE project_id = NEW.project_id;

  IF total_tasks > 0 AND done_tasks = total_tasks THEN
    UPDATE public.projects SET status = 'complete', progress = 100 WHERE id = NEW.project_id;
  ELSIF done_tasks > 0 THEN
    UPDATE public.projects 
    SET status = 'in_progress', 
        progress = ROUND((done_tasks::numeric / total_tasks::numeric) * 100)
    WHERE id = NEW.project_id AND status != 'need_revision';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_project_on_task_change
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_project_status_on_task_change();


-- Source: 20260227201511_e52476fa-79b5-45ce-804e-4576994fda51.sql

-- Track every submission attempt (Canvas-like submission history)
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  submission_type text NOT NULL CHECK (submission_type IN ('file', 'link', 'none')),
  submission_url text,
  submission_file_url text,
  comment text,
  attempt_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- Members see their own submissions
CREATE POLICY "Members see own submissions"
ON public.task_submissions FOR SELECT
USING (submitted_by = auth.uid());

-- Leads see submissions for tasks they manage
CREATE POLICY "Project leads see all submissions"
ON public.task_submissions FOR SELECT
USING (has_role(auth.uid(), 'project_lead'::app_role));

CREATE POLICY "Team leads see department submissions"
ON public.task_submissions FOR SELECT
USING (
  has_role(auth.uid(), 'team_lead'::app_role) AND
  task_id IN (
    SELECT t.id FROM public.tasks t
    WHERE t.project_id IS NULL OR project_has_department(t.project_id, get_user_department(auth.uid()))
  )
);

-- Authenticated members can insert submissions
CREATE POLICY "Members can submit"
ON public.task_submissions FOR INSERT
WITH CHECK (submitted_by = auth.uid());


-- Source: 20260227201802_11338083-2c42-4172-b952-256fda5344fa.sql

-- Allow members to update their own assigned tasks (for submission workflow)
CREATE POLICY "Members can update own tasks"
ON public.tasks
FOR UPDATE
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());


-- Source: 20260304221258_f52734df-e6e5-440e-b3fe-fd89b1f36ac5.sql

CREATE OR REPLACE FUNCTION public.close_company_workspace(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is a project_lead in this company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id
      AND user_id = auth.uid()
      AND role = 'project_lead'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active project leads can close a workspace';
  END IF;

  -- Deactivate ALL memberships for this company
  UPDATE public.company_memberships
  SET is_active = false
  WHERE company_id = _company_id;
END;
$$;


-- Source: 20260308110137_ad156708-ba68-4112-ac01-9db081d0a275.sql
-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;

CREATE POLICY "Project leads can insert projects"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'project_lead'::app_role) 
  OR has_company_role(auth.uid(), ARRAY['project_lead'::app_role, 'team_lead'::app_role])
);

-- Source: 20260308111228_032d298d-c95a-4aa5-a81c-c926cffc060c.sql
-- Fix all restrictive SELECT policies on projects table to be PERMISSIVE

-- Drop and recreate Project leads see all projects
DROP POLICY IF EXISTS "Project leads see all projects" ON public.projects;
CREATE POLICY "Project leads see all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'project_lead'::app_role)
  OR has_company_role(auth.uid(), ARRAY['project_lead'::app_role])
);

-- Drop and recreate Team leads see department projects  
DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
CREATE POLICY "Team leads see department projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'team_lead'::app_role) AND (department = get_user_department(auth.uid()))
  OR (has_company_role(auth.uid(), ARRAY['team_lead'::app_role]) AND (department = get_user_department(auth.uid())))
);

-- Drop and recreate Members see projects with their tasks
DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;
CREATE POLICY "Members see projects with their tasks"
ON public.projects
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'member'::app_role) OR has_company_role(auth.uid(), ARRAY['member'::app_role]))
  AND user_has_tasks_in_project(auth.uid(), id)
);

-- Source: 20260308113310_f2482b8d-3100-4b19-94b6-c21050bab1e4.sql
-- Function to transfer role to another member in the same company
CREATE OR REPLACE FUNCTION public.transfer_role_to_member(
  _company_id uuid,
  _target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _caller_department department;
  _target_membership_exists boolean;
BEGIN
  -- Get caller's current role and department in this company
  SELECT role, department INTO _caller_role, _caller_department
  FROM public.company_memberships
  WHERE company_id = _company_id
    AND user_id = auth.uid()
    AND is_active = true;
  
  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;
  
  -- Check if target user is a member of this company
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_id = _company_id
      AND user_id = _target_user_id
      AND is_active = true
  ) INTO _target_membership_exists;
  
  IF NOT _target_membership_exists THEN
    RAISE EXCEPTION 'Target user is not an active member of this workspace';
  END IF;
  
  -- Cannot transfer to yourself
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot transfer role to yourself';
  END IF;
  
  -- Update target user's membership to caller's role
  UPDATE public.company_memberships
  SET role = _caller_role,
      department = _caller_department
  WHERE company_id = _company_id
    AND user_id = _target_user_id;
  
  -- Downgrade caller to member role
  UPDATE public.company_memberships
  SET role = 'member',
      department = COALESCE(_caller_department, 'tech')
  WHERE company_id = _company_id
    AND user_id = auth.uid();
END;
$$;

-- Function to leave a workspace
CREATE OR REPLACE FUNCTION public.leave_workspace(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _member_count integer;
BEGIN
  -- Get caller's role
  SELECT role INTO _caller_role
  FROM public.company_memberships
  WHERE company_id = _company_id
    AND user_id = auth.uid()
    AND is_active = true;
  
  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;
  
  -- Count active members in this company
  SELECT COUNT(*) INTO _member_count
  FROM public.company_memberships
  WHERE company_id = _company_id AND is_active = true;
  
  -- If project_lead and last remaining lead, must transfer first
  IF _caller_role = 'project_lead' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_memberships
      WHERE company_id = _company_id
        AND user_id != auth.uid()
        AND role = 'project_lead'
        AND is_active = true
    ) AND _member_count > 1 THEN
      RAISE EXCEPTION 'You are the only project lead. Transfer your role before leaving.';
    END IF;
  END IF;
  
  -- Deactivate the membership (soft delete)
  UPDATE public.company_memberships
  SET is_active = false
  WHERE company_id = _company_id
    AND user_id = auth.uid();
END;
$$;

-- Source: 20260308120919_d5ef7c8f-00ed-403e-80e8-33585fe002ab.sql

-- Function: Project Lead removes a Team Lead from company
CREATE OR REPLACE FUNCTION public.remove_company_member(_company_id uuid, _target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _target_role app_role;
BEGIN
  -- Get caller's role in this company
  SELECT role INTO _caller_role
  FROM public.company_memberships
  WHERE company_id = _company_id AND user_id = auth.uid() AND is_active = true;

  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;

  -- Get target's role in this company
  SELECT role INTO _target_role
  FROM public.company_memberships
  WHERE company_id = _company_id AND user_id = _target_user_id AND is_active = true;

  IF _target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not an active member of this workspace';
  END IF;

  -- Cannot remove yourself
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself. Use leave workspace instead.';
  END IF;

  -- Project Lead can remove Team Leads
  IF _caller_role = 'project_lead' AND _target_role = 'team_lead' THEN
    UPDATE public.company_memberships
    SET is_active = false
    WHERE company_id = _company_id AND user_id = _target_user_id;
    RETURN;
  END IF;

  -- Team Lead can remove Members
  IF _caller_role = 'team_lead' AND _target_role = 'member' THEN
    UPDATE public.company_memberships
    SET is_active = false
    WHERE company_id = _company_id AND user_id = _target_user_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'You do not have permission to remove this member';
END;
$$;

-- Function: Project Lead adds a Team Lead / Team Lead adds a Member
-- This re-activates an inactive membership or is used for role changes
CREATE OR REPLACE FUNCTION public.add_company_member(_company_id uuid, _target_user_id uuid, _target_role app_role, _target_department department DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _caller_role app_role;
  _existing_membership_id uuid;
BEGIN
  -- Get caller's role
  SELECT role INTO _caller_role
  FROM public.company_memberships
  WHERE company_id = _company_id AND user_id = auth.uid() AND is_active = true;

  IF _caller_role IS NULL THEN
    RAISE EXCEPTION 'You are not an active member of this workspace';
  END IF;

  -- Project Lead can add Team Leads
  IF _caller_role = 'project_lead' AND _target_role = 'team_lead' THEN
    -- Check if inactive membership exists
    SELECT id INTO _existing_membership_id
    FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _target_user_id AND is_active = false;

    IF _existing_membership_id IS NOT NULL THEN
      UPDATE public.company_memberships
      SET is_active = true, role = _target_role, department = _target_department
      WHERE id = _existing_membership_id;
    ELSE
      RAISE EXCEPTION 'User must first join the workspace via invite code';
    END IF;
    RETURN;
  END IF;

  -- Team Lead can add Members
  IF _caller_role = 'team_lead' AND _target_role = 'member' THEN
    SELECT id INTO _existing_membership_id
    FROM public.company_memberships
    WHERE company_id = _company_id AND user_id = _target_user_id AND is_active = false;

    IF _existing_membership_id IS NOT NULL THEN
      UPDATE public.company_memberships
      SET is_active = true, role = _target_role, department = _target_department
      WHERE id = _existing_membership_id;
    ELSE
      RAISE EXCEPTION 'User must first join the workspace via invite code';
    END IF;
    RETURN;
  END IF;

  RAISE EXCEPTION 'You do not have permission to add this member';
END;
$$;

-- Allow members to see ALL memberships in their company (needed for the management UI)
CREATE POLICY "Members see company memberships"
ON public.company_memberships
FOR SELECT
USING (
  company_id IN (
    SELECT cm.company_id FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid() AND cm.is_active = true
  )
);


-- Source: 20260308154713_bede7328-638a-4cb6-b452-75abc82a8694.sql
-- Allow users to see tasks they assigned (assigned_by)
CREATE POLICY "Users see tasks they assigned"
ON public.tasks FOR SELECT
TO authenticated
USING (assigned_by = auth.uid());


-- Source: 20260308155054_6d75ddc7-1ab2-4876-97c8-7b29e1310292.sql
-- Allow task creators (assigned_by) to delete tasks they assigned
CREATE POLICY "Users can delete tasks they assigned"
ON public.tasks FOR DELETE
TO authenticated
USING (assigned_by = auth.uid());

-- Allow project leads to delete any task
CREATE POLICY "Project leads can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'project_lead'::app_role));


-- Source: 20260308161535_72a7c661-616a-449b-a898-71e66faab2f3.sql
CREATE TRIGGER update_project_status_on_task_change
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_project_status_on_task_change();

-- Source: 20260308232820_920c108b-7853-4ff0-8730-2a8c56b1b7d3.sql

-- Add company_id to projects table
ALTER TABLE public.projects ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to tasks table  
ALTER TABLE public.tasks ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop old SELECT policies on projects that don't scope by company
DROP POLICY IF EXISTS "Project leads see all projects" ON public.projects;
DROP POLICY IF EXISTS "Team leads see department projects" ON public.projects;
DROP POLICY IF EXISTS "Members see projects with their tasks" ON public.projects;
DROP POLICY IF EXISTS "Project leads can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can delete projects" ON public.projects;

-- New company-scoped SELECT policies for projects
CREATE POLICY "Project leads see company projects" ON public.projects FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads see department company projects" ON public.projects FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND department = get_user_department(auth.uid())
);

CREATE POLICY "Members see projects with their tasks" ON public.projects FOR SELECT TO authenticated
USING (
  (has_company_role(auth.uid(), ARRAY['member'::app_role]))
  AND user_has_tasks_in_project(auth.uid(), id)
);

-- INSERT policy scoped by company
CREATE POLICY "Leads can insert company projects" ON public.projects FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role IN ('project_lead', 'team_lead') AND is_active = true
  )
);

-- UPDATE policy scoped by company
CREATE POLICY "Project leads can update company projects" ON public.projects FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

-- DELETE policy scoped by company
CREATE POLICY "Project leads can delete company projects" ON public.projects FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

-- Drop old SELECT policies on tasks that don't scope by company
DROP POLICY IF EXISTS "Project leads see all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads see department tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members see assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users see tasks they assigned" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can update own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks they assigned" ON public.tasks;

-- New company-scoped SELECT policies for tasks
CREATE POLICY "Project leads see company tasks" ON public.tasks FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads see company department tasks" ON public.tasks FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND ((project_id IS NULL) OR project_has_department(project_id, get_user_department(auth.uid())))
);

CREATE POLICY "Members see assigned tasks" ON public.tasks FOR SELECT TO authenticated
USING (assigned_to = auth.uid());

CREATE POLICY "Users see tasks they assigned" ON public.tasks FOR SELECT TO authenticated
USING (assigned_by = auth.uid());

-- INSERT policies
CREATE POLICY "Project leads can insert company tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads can insert company tasks" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND ((project_id IS NULL) OR project_has_department(project_id, get_user_department(auth.uid())))
);

-- UPDATE policies
CREATE POLICY "Project leads can update company tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Team leads can update company tasks" ON public.tasks FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'team_lead' AND is_active = true
  )
  AND ((project_id IS NULL) OR project_has_department(project_id, get_user_department(auth.uid())))
);

CREATE POLICY "Members can update own tasks" ON public.tasks FOR UPDATE TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- DELETE policies
CREATE POLICY "Project leads can delete company tasks" ON public.tasks FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.company_memberships
    WHERE user_id = auth.uid() AND role = 'project_lead' AND is_active = true
  )
);

CREATE POLICY "Users can delete tasks they assigned" ON public.tasks FOR DELETE TO authenticated
USING (assigned_by = auth.uid());


-- Source: 20260308233214_63690e0a-1995-457b-b3d1-ce0537702873.sql

CREATE POLICY "Project leads can delete own company" ON public.companies FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE company_memberships.company_id = companies.id
      AND company_memberships.user_id = auth.uid()
      AND company_memberships.role = 'project_lead'
      AND company_memberships.is_active = true
  )
);

-- Also allow cascading delete of memberships by company leads
CREATE POLICY "Project leads can delete company memberships" ON public.company_memberships FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_memberships cm2
    WHERE cm2.company_id = company_memberships.company_id
      AND cm2.user_id = auth.uid()
      AND cm2.role = 'project_lead'
      AND cm2.is_active = true
  )
);


-- Source: 20260725001000_fresh_bells_backend.sql
-- Bells fresh-backend baseline and security hardening.
-- This migration is designed to follow the imported Lovable base schema.

-- Final application fields.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists bio text,
  add column if not exists job_title text,
  add column if not exists timezone text,
  add column if not exists avatar_url text;

alter table public.companies
  add column if not exists invite_code text;

update public.companies
set invite_code = upper(substr(md5(id::text || random()::text), 1, 8))
where invite_code is null;

alter table public.companies
  alter column invite_code set default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  alter column invite_code set not null;

create unique index if not exists companies_invite_code_key
  on public.companies (invite_code);

alter table public.projects
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.tasks
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists submission_type text,
  add column if not exists submission_url text,
  add column if not exists submission_file_url text,
  alter column project_id drop not null;

alter table public.projects alter column company_id set not null;
alter table public.tasks alter column company_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_submission_type_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks add constraint tasks_submission_type_check
      check (submission_type is null or submission_type in ('file', 'link', 'none'));
  end if;
end
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  submission_type text not null check (submission_type in ('file', 'link', 'none')),
  submission_url text,
  submission_file_url text,
  comment text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
alter table public.task_submissions enable row level security;

create index if not exists company_memberships_user_company_idx
  on public.company_memberships (user_id, company_id, is_active);
create index if not exists company_memberships_company_idx
  on public.company_memberships (company_id, is_active);
create index if not exists projects_company_idx on public.projects (company_id);
create index if not exists tasks_company_idx on public.tasks (company_id);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);
create index if not exists messages_company_participants_idx
  on public.messages (company_id, sender_id, receiver_id, created_at desc);
create index if not exists task_submissions_task_idx
  on public.task_submissions (task_id, created_at desc);
create index if not exists invitations_email_status_idx
  on public.invitations (lower(email), status);

-- Keep authorization helpers out of the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.has_company_role(
  _company_id uuid,
  _roles public.app_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = _company_id
      and cm.user_id = (select auth.uid())
      and cm.is_active = true
      and (_roles is null or cm.role = any(_roles))
  )
$$;

create or replace function private.user_is_company_member(
  _company_id uuid,
  _user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships cm
    where cm.company_id = _company_id
      and cm.user_id = _user_id
      and cm.is_active = true
  )
$$;

create or replace function private.shares_company(_other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships mine
    join public.company_memberships theirs
      on theirs.company_id = mine.company_id
     and theirs.is_active = true
    where mine.user_id = (select auth.uid())
      and mine.is_active = true
      and theirs.user_id = _other_user_id
  )
$$;

create or replace function private.membership_department(_company_id uuid)
returns public.department
language sql
stable
security definer
set search_path = ''
as $$
  select cm.department
  from public.company_memberships cm
  where cm.company_id = _company_id
    and cm.user_id = (select auth.uid())
    and cm.is_active = true
  limit 1
$$;

create or replace function private.user_has_task_in_project(_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tasks t
    where t.project_id = _project_id
      and t.assigned_to = (select auth.uid())
  )
$$;

create or replace function private.project_is_in_member_department(
  _project_id uuid,
  _company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.projects p
    join public.company_memberships cm on cm.company_id = p.company_id
    where p.id = _project_id
      and p.company_id = _company_id
      and cm.user_id = (select auth.uid())
      and cm.is_active = true
      and cm.role = 'team_lead'::public.app_role
      and p.department = cm.department
  )
$$;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- Replace all legacy policies with company-scoped policies.
drop policy if exists "Anyone authenticated can view profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users view relevant profiles" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_company(user_id));
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Anyone authenticated can view roles" on public.user_roles;
drop policy if exists "Users can insert own role" on public.user_roles;
create policy "Users view own legacy role" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users see their companies" on public.companies;
drop policy if exists "Authenticated users can see companies" on public.companies;
drop policy if exists "Authenticated can create companies" on public.companies;
drop policy if exists "Project leads can delete own company" on public.companies;
create policy "Members view their companies" on public.companies
  for select to authenticated
  using (private.has_company_role(id, null));
create policy "Project managers delete their companies" on public.companies
  for delete to authenticated
  using (private.has_company_role(id, array['project_lead'::public.app_role]));

drop policy if exists "Users see own memberships" on public.company_memberships;
drop policy if exists "Users can join companies" on public.company_memberships;
drop policy if exists "Users can update own membership" on public.company_memberships;
drop policy if exists "Members see company memberships" on public.company_memberships;
drop policy if exists "Project leads can delete company memberships" on public.company_memberships;
create policy "Members view company memberships" on public.company_memberships
  for select to authenticated
  using (private.has_company_role(company_id, null));

drop policy if exists "Company members see announcements" on public.announcements;
drop policy if exists "Leads can create announcements" on public.announcements;
create policy "Members view company announcements" on public.announcements
  for select to authenticated
  using (
    private.has_company_role(company_id, null)
    and (
      target_role is null
      or private.has_company_role(company_id, array[target_role])
    )
  );
create policy "Leads create company announcements" on public.announcements
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );

drop policy if exists "Users manage own reads" on public.announcement_reads;
drop policy if exists "Users can mark read" on public.announcement_reads;
create policy "Users view own announcement reads" on public.announcement_reads
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users mark announcements read" on public.announcement_reads
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id
        and private.has_company_role(a.company_id, null)
    )
  );

drop policy if exists "Company members see documents" on public.documents;
drop policy if exists "Members can submit documents" on public.documents;
drop policy if exists "Leads can update documents" on public.documents;
create policy "Members view company documents" on public.documents
  for select to authenticated
  using (private.has_company_role(company_id, null));
create policy "Members submit company documents" on public.documents
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Leads update company documents" on public.documents
  for update to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  )
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );

drop policy if exists "Company members see annotations" on public.document_annotations;
drop policy if exists "Leads can annotate" on public.document_annotations;
create policy "Members view document annotations" on public.document_annotations
  for select to authenticated
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and private.has_company_role(d.company_id, null)
    )
  );
create policy "Members create document annotations" on public.document_annotations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = document_id
        and private.has_company_role(d.company_id, null)
    )
  );

drop policy if exists "Users see own notifications" on public.notifications;
drop policy if exists "System can create notifications" on public.notifications;
drop policy if exists "Authenticated can create notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users view own notifications" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Users update own notifications" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Company leads see invitations" on public.invitations;
drop policy if exists "Invitees see own invitations" on public.invitations;
drop policy if exists "Leads can invite" on public.invitations;
drop policy if exists "Invitees can respond" on public.invitations;
create policy "Leads view company invitations" on public.invitations
  for select to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );
create policy "Invitees view own invitations" on public.invitations
  for select to authenticated
  using (
    lower(email) = lower(coalesce((select email from public.profiles where user_id = (select auth.uid())), ''))
  );
create policy "Leads create company invitations" on public.invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and role <> 'project_lead'::public.app_role
  );

drop policy if exists "Users see own messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Receiver can mark read" on public.messages;
create policy "Participants view company messages" on public.messages
  for select to authenticated
  using (
    (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()))
    and private.has_company_role(company_id, null)
  );
create policy "Members send company messages" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.has_company_role(company_id, null)
    and private.user_is_company_member(company_id, receiver_id)
  );
create policy "Receivers mark company messages read" on public.messages
  for update to authenticated
  using (
    receiver_id = (select auth.uid())
    and private.has_company_role(company_id, null)
  )
  with check (
    receiver_id = (select auth.uid())
    and private.has_company_role(company_id, null)
  );

drop policy if exists "Project leads see all projects" on public.projects;
drop policy if exists "Team leads see department projects" on public.projects;
drop policy if exists "Members see projects with their tasks" on public.projects;
drop policy if exists "Project leads can insert projects" on public.projects;
drop policy if exists "Project leads can update projects" on public.projects;
drop policy if exists "Project leads can delete projects" on public.projects;
create policy "Project managers view company projects" on public.projects
  for select to authenticated
  using (private.has_company_role(company_id, array['project_lead'::public.app_role]));
create policy "Team leads view department projects" on public.projects
  for select to authenticated
  using (
    private.has_company_role(company_id, array['team_lead'::public.app_role])
    and department = private.membership_department(company_id)
  );
create policy "Contributors view assigned projects" on public.projects
  for select to authenticated
  using (
    private.has_company_role(company_id, array['member'::public.app_role])
    and private.user_has_task_in_project(id)
  );
create policy "Leads create company projects" on public.projects
  for insert to authenticated
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or department = private.membership_department(company_id)
    )
  );
create policy "Leads update company projects" on public.projects
  for update to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or department = private.membership_department(company_id)
    )
  )
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );
create policy "Project managers delete company projects" on public.projects
  for delete to authenticated
  using (private.has_company_role(company_id, array['project_lead'::public.app_role]));

drop policy if exists "Project leads see all tasks" on public.tasks;
drop policy if exists "Team leads see department tasks" on public.tasks;
drop policy if exists "Members see assigned tasks" on public.tasks;
drop policy if exists "Users see tasks they assigned" on public.tasks;
drop policy if exists "Team leads can insert tasks" on public.tasks;
drop policy if exists "Project leads can insert tasks" on public.tasks;
drop policy if exists "Team leads can update tasks" on public.tasks;
drop policy if exists "Project leads can update tasks" on public.tasks;
drop policy if exists "Members can update own tasks" on public.tasks;
drop policy if exists "Project leads can delete tasks" on public.tasks;
drop policy if exists "Users can delete tasks they assigned" on public.tasks;
create policy "Project managers view company tasks" on public.tasks
  for select to authenticated
  using (private.has_company_role(company_id, array['project_lead'::public.app_role]));
create policy "Team leads view department tasks" on public.tasks
  for select to authenticated
  using (
    private.has_company_role(company_id, array['team_lead'::public.app_role])
    and (
      project_id is null
      or private.project_is_in_member_department(project_id, company_id)
    )
  );
create policy "Contributors view assigned tasks" on public.tasks
  for select to authenticated
  using (
    assigned_to = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Assignees view tasks they created" on public.tasks
  for select to authenticated
  using (
    assigned_by = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Leads create company tasks" on public.tasks
  for insert to authenticated
  with check (
    assigned_by = (select auth.uid())
    and private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or project_id is null
      or private.project_is_in_member_department(project_id, company_id)
    )
    and private.user_is_company_member(company_id, assigned_to)
  );
create policy "Leads update company tasks" on public.tasks
  for update to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or project_id is null
      or private.project_is_in_member_department(project_id, company_id)
    )
  )
  with check (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
  );
create policy "Contributors update assigned tasks" on public.tasks
  for update to authenticated
  using (
    assigned_to = (select auth.uid())
    and private.has_company_role(company_id, null)
  )
  with check (
    assigned_to = (select auth.uid())
    and private.has_company_role(company_id, null)
  );
create policy "Leads delete company tasks" on public.tasks
  for delete to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    and (
      private.has_company_role(company_id, array['project_lead'::public.app_role])
      or assigned_by = (select auth.uid())
    )
  );

drop policy if exists "Members see own submissions" on public.task_submissions;
drop policy if exists "Project leads see all submissions" on public.task_submissions;
drop policy if exists "Team leads see department submissions" on public.task_submissions;
drop policy if exists "Members can submit" on public.task_submissions;
create policy "Members view relevant task submissions" on public.task_submissions
  for select to authenticated
  using (
    submitted_by = (select auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = task_id
        and private.has_company_role(
          t.company_id,
          array['project_lead'::public.app_role, 'team_lead'::public.app_role]
        )
    )
  );
create policy "Contributors submit assigned tasks" on public.task_submissions
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.assigned_to = (select auth.uid())
        and private.has_company_role(t.company_id, null)
    )
  );

-- Atomic company creation avoids orphan companies and direct membership writes.
create or replace function public.create_company(
  _name text,
  _role public.app_role default 'project_lead'::public.app_role,
  _department public.department default null
)
returns public.companies
language plpgsql
security definer
set search_path = ''
as $$
declare
  _user_id uuid := auth.uid();
  _company public.companies;
begin
  if _user_id is null then
    raise exception 'Authentication required';
  end if;
  if nullif(trim(_name), '') is null then
    raise exception 'Organization name is required';
  end if;
  if _role <> 'project_lead'::public.app_role and _department is null then
    raise exception 'Department is required for this role';
  end if;

  insert into public.companies (name)
  values (trim(_name))
  returning * into _company;

  insert into public.company_memberships (user_id, company_id, role, department)
  values (
    _user_id,
    _company.id,
    _role,
    case when _role = 'project_lead'::public.app_role then null else _department end
  );

  return _company;
end;
$$;

create or replace function public.close_company_workspace(_company_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_company_role(
    _company_id,
    array['project_lead'::public.app_role]
  ) then
    raise exception 'Only active project managers can close a workspace';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id;
end;
$$;

create or replace function public.transfer_role_to_member(
  _company_id uuid,
  _target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
  _caller_department public.department;
  _target_role public.app_role;
begin
  select role, department into _caller_role, _caller_department
  from public.company_memberships
  where company_id = _company_id
    and user_id = auth.uid()
    and is_active = true;

  if _caller_role not in ('project_lead'::public.app_role, 'team_lead'::public.app_role) then
    raise exception 'Only leads can transfer a role';
  end if;
  if _target_user_id = auth.uid() then
    raise exception 'Cannot transfer a role to yourself';
  end if;

  select role into _target_role
  from public.company_memberships
  where company_id = _company_id
    and user_id = _target_user_id
    and is_active = true;

  if _target_role is null then
    raise exception 'Target user is not an active workspace member';
  end if;
  if _caller_role = 'team_lead'::public.app_role and _target_role <> 'member'::public.app_role then
    raise exception 'Team leads can transfer only to contributors';
  end if;

  update public.company_memberships
  set role = _caller_role, department = _caller_department
  where company_id = _company_id and user_id = _target_user_id;

  update public.company_memberships
  set role = 'member'::public.app_role,
      department = coalesce(_caller_department, 'tech'::public.department)
  where company_id = _company_id and user_id = auth.uid();
end;
$$;

create or replace function public.leave_workspace(_company_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
begin
  select role into _caller_role
  from public.company_memberships
  where company_id = _company_id
    and user_id = auth.uid()
    and is_active = true;

  if _caller_role is null then
    raise exception 'You are not an active workspace member';
  end if;
  if _caller_role = 'project_lead'::public.app_role
     and not exists (
       select 1 from public.company_memberships
       where company_id = _company_id
         and user_id <> auth.uid()
         and role = 'project_lead'::public.app_role
         and is_active = true
     ) then
    raise exception 'Transfer the project manager role or delete the organization before leaving';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id and user_id = auth.uid();
end;
$$;

create or replace function public.remove_company_member(
  _company_id uuid,
  _target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
  _target_role public.app_role;
begin
  select role into _caller_role from public.company_memberships
  where company_id = _company_id and user_id = auth.uid() and is_active = true;
  select role into _target_role from public.company_memberships
  where company_id = _company_id and user_id = _target_user_id and is_active = true;

  if _target_user_id = auth.uid() then
    raise exception 'Use leave workspace to remove yourself';
  end if;
  if not (
    (_caller_role = 'project_lead'::public.app_role and _target_role in ('team_lead'::public.app_role, 'member'::public.app_role))
    or (_caller_role = 'team_lead'::public.app_role and _target_role = 'member'::public.app_role)
  ) then
    raise exception 'You do not have permission to remove this member';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id and user_id = _target_user_id;
end;
$$;

create or replace function public.add_company_member(
  _company_id uuid,
  _target_user_id uuid,
  _target_role public.app_role,
  _target_department public.department default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
begin
  select role into _caller_role from public.company_memberships
  where company_id = _company_id and user_id = auth.uid() and is_active = true;

  if not (
    (_caller_role = 'project_lead'::public.app_role and _target_role in ('team_lead'::public.app_role, 'member'::public.app_role))
    or (_caller_role = 'team_lead'::public.app_role and _target_role = 'member'::public.app_role)
  ) then
    raise exception 'You do not have permission to add this member';
  end if;

  update public.company_memberships
  set is_active = true,
      role = _target_role,
      department = _target_department
  where company_id = _company_id
    and user_id = _target_user_id
    and is_active = false;

  if not found then
    raise exception 'User must first join through an invitation or invite code';
  end if;
end;
$$;

create or replace function private.update_project_status_on_task_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _total integer;
  _done integer;
begin
  if new.project_id is null then
    return new;
  end if;

  select count(*), count(*) filter (
    where status in (
      'completed'::public.task_status,
      'approved'::public.task_status,
      'pending_approval'::public.task_status
    )
  )
  into _total, _done
  from public.tasks
  where project_id = new.project_id;

  if _total > 0 and _done = _total then
    update public.projects set status = 'complete'::public.project_status, progress = 100
    where id = new.project_id;
  elsif _done > 0 then
    update public.projects
    set status = 'in_progress'::public.project_status,
        progress = round((_done::numeric / _total::numeric) * 100)
    where id = new.project_id and status <> 'need_revision'::public.project_status;
  else
    update public.projects set status = 'assigned'::public.project_status, progress = 0
    where id = new.project_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_update_project_on_task_change on public.tasks;
drop trigger if exists update_project_status_on_task_change on public.tasks;
create trigger update_project_status_on_task_change
after insert or update of status on public.tasks
for each row execute function private.update_project_status_on_task_change();

-- Harden the auth profile trigger. Name metadata is display data, never authorization.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), new.email, 'New user'),
    coalesce(new.email, '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- File uploads are private and company-scoped by their first path segment.
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can upload files" on storage.objects;
drop policy if exists "Authenticated users can view files" on storage.objects;
drop policy if exists "Users can update own files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;
create policy "Company members upload project files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );
create policy "Company members view project files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );
create policy "Owners update project files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid()::text)
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  )
  with check (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid()::text)
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );
create policy "Owners delete project files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and owner_id = (select auth.uid()::text)
    and private.has_company_role(((storage.foldername(name))[1])::uuid, null)
  );

-- Explicit Data API grants for new-project defaults.
revoke all on table
  public.profiles,
  public.user_roles,
  public.companies,
  public.company_memberships,
  public.announcements,
  public.announcement_reads,
  public.documents,
  public.document_annotations,
  public.notifications,
  public.invitations,
  public.messages,
  public.projects,
  public.tasks,
  public.task_submissions
from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, delete on public.companies to authenticated;
grant select on public.company_memberships to authenticated;
grant select, insert on public.announcements to authenticated;
grant select, insert on public.announcement_reads to authenticated;
grant select, insert, update on public.documents to authenticated;
grant select, insert on public.document_annotations to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert on public.invitations to authenticated;
grant select, insert on public.messages to authenticated;
grant update (is_read) on public.messages to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert on public.task_submissions to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_company(text, public.app_role, public.department) to authenticated;
grant execute on function public.close_company_workspace(uuid) to authenticated;
grant execute on function public.transfer_role_to_member(uuid, uuid) to authenticated;
grant execute on function public.leave_workspace(uuid) to authenticated;
grant execute on function public.remove_company_member(uuid, uuid) to authenticated;
grant execute on function public.add_company_member(uuid, uuid, public.app_role, public.department) to authenticated;

-- Realtime is used only for participant-scoped messages.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;


-- Source: 20260725002000_fix_announcement_reads_upsert.sql
-- The frontend marks an announcement read with an upsert so repeated clicks stay idempotent.
-- Upserts require UPDATE permission when the read receipt already exists.

drop policy if exists "Users update own announcement reads" on public.announcement_reads;
create policy "Users update own announcement reads" on public.announcement_reads
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update on public.announcement_reads to authenticated;


-- Source: 20260725003000_messages_company_fk_cascade.sql
-- Older Lovable schema versions created this foreign key without a delete action.
-- Workspace deletion must remove its direct messages with the rest of the company data.

alter table public.messages
  drop constraint if exists messages_company_id_fkey;

alter table public.messages
  add constraint messages_company_id_fkey
  foreign key (company_id)
  references public.companies(id)
  on delete cascade;


-- Source: 20260725004000_backend_advisor_fixes.sql
-- Follow-up hardening and query-plan improvements from Supabase advisors.

-- Legacy helpers are no longer part of Bells authorization and must not be callable.
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
revoke execute on function public.get_user_role(uuid) from authenticated;
revoke execute on function public.get_user_department(uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.update_updated_at_column() from authenticated;

-- Cover all foreign-key lookup paths used by RLS and cascade operations.
create index if not exists announcements_company_idx on public.announcements(company_id);
create index if not exists announcements_project_idx on public.announcements(project_id);
create index if not exists document_annotations_document_idx on public.document_annotations(document_id);
create index if not exists documents_company_idx on public.documents(company_id);
create index if not exists documents_project_idx on public.documents(project_id);
create index if not exists invitations_company_idx on public.invitations(company_id);
create index if not exists notifications_company_idx on public.notifications(company_id);
create index if not exists projects_lead_idx on public.projects(lead_id);
create index if not exists task_submissions_submitter_idx on public.task_submissions(submitted_by);
create index if not exists tasks_assigned_by_idx on public.tasks(assigned_by);

-- Consolidate equivalent permissive policies so each operation evaluates one policy.
drop policy if exists "Leads view company invitations" on public.invitations;
drop policy if exists "Invitees view own invitations" on public.invitations;
create policy "Users view relevant invitations" on public.invitations
  for select to authenticated
  using (
    private.has_company_role(
      company_id,
      array['project_lead'::public.app_role, 'team_lead'::public.app_role]
    )
    or lower(email) = lower(coalesce(
      (select p.email from public.profiles p where p.user_id = (select auth.uid())),
      ''
    ))
  );

drop policy if exists "Project managers view company projects" on public.projects;
drop policy if exists "Team leads view department projects" on public.projects;
drop policy if exists "Contributors view assigned projects" on public.projects;
create policy "Members view permitted company projects" on public.projects
  for select to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and department = private.membership_department(company_id)
    )
    or (
      private.has_company_role(company_id, array['member'::public.app_role])
      and private.user_has_task_in_project(id)
    )
  );

drop policy if exists "Leads update company projects" on public.projects;
create policy "Leads update permitted company projects" on public.projects
  for update to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and department = private.membership_department(company_id)
    )
  )
  with check (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and department = private.membership_department(company_id)
    )
  );

drop policy if exists "Project managers view company tasks" on public.tasks;
drop policy if exists "Team leads view department tasks" on public.tasks;
drop policy if exists "Contributors view assigned tasks" on public.tasks;
drop policy if exists "Assignees view tasks they created" on public.tasks;
create policy "Members view permitted company tasks" on public.tasks
  for select to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and (project_id is null or private.project_is_in_member_department(project_id, company_id))
    )
    or (
      assigned_to = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
    or (
      assigned_by = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
  );

drop policy if exists "Leads update company tasks" on public.tasks;
drop policy if exists "Contributors update assigned tasks" on public.tasks;
create policy "Members update permitted company tasks" on public.tasks
  for update to authenticated
  using (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and (project_id is null or private.project_is_in_member_department(project_id, company_id))
    )
    or (
      assigned_to = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
  )
  with check (
    private.has_company_role(company_id, array['project_lead'::public.app_role])
    or (
      private.has_company_role(company_id, array['team_lead'::public.app_role])
      and (project_id is null or private.project_is_in_member_department(project_id, company_id))
    )
    or (
      assigned_to = (select auth.uid())
      and private.has_company_role(company_id, null)
    )
  );

-- Final restoration hardening: all changes below commit with the schema above.
-- Remove superseded legacy policies before revoking their old authorization helpers.
DROP POLICY IF EXISTS "Authenticated can join projects" ON public.project_members;
DROP POLICY IF EXISTS "Members see project members" ON public.project_members;
DROP POLICY IF EXISTS "Leads can insert company projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can delete company projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can update company projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads see company projects" ON public.projects;
DROP POLICY IF EXISTS "Team leads see department company projects" ON public.projects;
DROP POLICY IF EXISTS "Project leads can delete company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can insert company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads can update company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Project leads see company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads can insert company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads can update company tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team leads see company department tasks" ON public.tasks;
-- Project membership is now represented by company_memberships; the legacy table is unused.
REVOKE ALL ON TABLE public.project_members FROM PUBLIC, anon, authenticated;
-- Signup metadata must not create legacy authorization roles.
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
create or replace function public.transfer_role_to_member(
  _company_id uuid,
  _target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
  _caller_department public.department;
  _target_role public.app_role;
begin
  select role, department into _caller_role, _caller_department
  from public.company_memberships
  where company_id = _company_id
    and user_id = auth.uid()
    and is_active = true;

  if _caller_role is null or _caller_role not in ('project_lead'::public.app_role, 'team_lead'::public.app_role) then
    raise exception 'Only leads can transfer a role';
  end if;
  if _target_user_id = auth.uid() then
    raise exception 'Cannot transfer a role to yourself';
  end if;

  select role into _target_role
  from public.company_memberships
  where company_id = _company_id
    and user_id = _target_user_id
    and is_active = true;

  if _target_role is null then
    raise exception 'Target user is not an active workspace member';
  end if;
  if _caller_role = 'team_lead'::public.app_role and _target_role <> 'member'::public.app_role then
    raise exception 'Team leads can transfer only to contributors';
  end if;

  update public.company_memberships
  set role = _caller_role, department = _caller_department
  where company_id = _company_id and user_id = _target_user_id;

  update public.company_memberships
  set role = 'member'::public.app_role,
      department = coalesce(_caller_department, 'tech'::public.department)
  where company_id = _company_id and user_id = auth.uid();
end;
$$;
create or replace function public.remove_company_member(
  _company_id uuid,
  _target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
  _target_role public.app_role;
begin
  select role into _caller_role from public.company_memberships
  where company_id = _company_id and user_id = auth.uid() and is_active = true;
  select role into _target_role from public.company_memberships
  where company_id = _company_id and user_id = _target_user_id and is_active = true;

  if _target_user_id = auth.uid() then
    raise exception 'Use leave workspace to remove yourself';
  end if;
  if (
    (_caller_role = 'project_lead'::public.app_role and _target_role in ('team_lead'::public.app_role, 'member'::public.app_role))
    or (_caller_role = 'team_lead'::public.app_role and _target_role = 'member'::public.app_role)
  ) is not true then
    raise exception 'You do not have permission to remove this member';
  end if;

  update public.company_memberships
  set is_active = false
  where company_id = _company_id and user_id = _target_user_id;
end;
$$;
create or replace function public.add_company_member(
  _company_id uuid,
  _target_user_id uuid,
  _target_role public.app_role,
  _target_department public.department default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  _caller_role public.app_role;
begin
  select role into _caller_role from public.company_memberships
  where company_id = _company_id and user_id = auth.uid() and is_active = true;

  if (
    (_caller_role = 'project_lead'::public.app_role and _target_role in ('team_lead'::public.app_role, 'member'::public.app_role))
    or (_caller_role = 'team_lead'::public.app_role and _target_role = 'member'::public.app_role)
  ) is not true then
    raise exception 'You do not have permission to add this member';
  end if;

  update public.company_memberships
  set is_active = true,
      role = _target_role,
      department = _target_department
  where company_id = _company_id
    and user_id = _target_user_id
    and is_active = false;

  if not found then
    raise exception 'User must first join through an invitation or invite code';
  end if;
end;
$$;
-- Expose only the six reviewed frontend RPCs; all other public functions are internal.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_company(text, public.app_role, public.department) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_company_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_role_to_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_company_member(uuid, uuid, public.app_role, public.department) TO authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;

COMMIT;
