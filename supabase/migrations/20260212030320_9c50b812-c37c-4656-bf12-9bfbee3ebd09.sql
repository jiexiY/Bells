
-- Fix overly permissive policies
DROP POLICY "Authenticated can create companies" ON public.companies;
CREATE POLICY "Authenticated can create companies" ON public.companies FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
