
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
