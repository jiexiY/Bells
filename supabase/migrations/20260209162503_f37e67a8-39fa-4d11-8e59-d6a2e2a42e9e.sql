
-- Enums
CREATE TYPE public.app_role AS ENUM ('project_lead', 'team_lead', 'member');
CREATE TYPE public.department AS ENUM ('tech', 'marketing', 'research');
CREATE TYPE public.project_status AS ENUM ('assigned', 'in_progress', 'complete');
CREATE TYPE public.task_status AS ENUM ('declined', 'approved', 'unchecked');

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
