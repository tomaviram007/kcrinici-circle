ALTER TABLE public.events ADD COLUMN IF NOT EXISTS feedback_hidden boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.feedback_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  row_id uuid,
  data jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feedback_backup TO authenticated;
GRANT ALL ON public.feedback_backup TO service_role;
ALTER TABLE public.feedback_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view feedback backup" ON public.feedback_backup FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.backup_feedback_row()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.feedback_backup(source_table, row_id, data, deleted_by)
  VALUES (TG_TABLE_NAME, OLD.id, to_jsonb(OLD), auth.uid());
  RETURN OLD;
END $$;

CREATE TRIGGER backup_event_feedback BEFORE DELETE ON public.event_feedback FOR EACH ROW EXECUTE FUNCTION public.backup_feedback_row();
CREATE TRIGGER backup_feedback_questions BEFORE DELETE ON public.feedback_questions FOR EACH ROW EXECUTE FUNCTION public.backup_feedback_row();
CREATE TRIGGER backup_feedback_forms BEFORE DELETE ON public.feedback_forms FOR EACH ROW EXECUTE FUNCTION public.backup_feedback_row();