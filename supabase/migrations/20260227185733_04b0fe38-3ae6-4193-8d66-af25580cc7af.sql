
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
