CREATE TRIGGER update_project_status_on_task_change
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_project_status_on_task_change();