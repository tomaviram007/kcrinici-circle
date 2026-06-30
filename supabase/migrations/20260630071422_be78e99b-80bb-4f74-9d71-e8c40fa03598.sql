ALTER TABLE public.jobs ALTER COLUMN is_approved SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.jobs_auto_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_approved := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_auto_approve ON public.jobs;
CREATE TRIGGER trg_jobs_auto_approve
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.jobs_auto_approve();

UPDATE public.jobs SET is_approved = true WHERE is_approved = false;