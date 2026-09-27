ALTER TABLE public.feedback_questions ADD COLUMN IF NOT EXISTS legacy_key text;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_questions_form_legacy_unique ON public.feedback_questions(form_id, legacy_key) WHERE legacy_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_questions_event_legacy_unique ON public.feedback_questions(event_id, legacy_key) WHERE legacy_key IS NOT NULL;
COMMENT ON COLUMN public.feedback_questions.legacy_key IS 'Stable key of an original questionnaire question; answers remain stored in their existing event_feedback columns.';