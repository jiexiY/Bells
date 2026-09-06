
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
