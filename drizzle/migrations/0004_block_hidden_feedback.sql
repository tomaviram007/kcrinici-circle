CREATE OR REPLACE FUNCTION public.get_event_feedback_info(_event_id uuid)
RETURNS TABLE(id uuid, title text, event_date timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id, e.title, e.event_date FROM public.events e
  WHERE e.id = _event_id AND COALESCE(e.feedback_hidden, false) = false
  UNION ALL
  SELECT f.id, f.title, f.form_date FROM public.feedback_forms f
  WHERE f.id = _event_id AND f.is_active;
$function$;

DROP FUNCTION IF EXISTS public.submit_event_feedback(uuid,text,smallint,boolean,smallint,boolean,text,text,text,text,text,smallint,smallint,text,text,text[],text,jsonb,text);

CREATE OR REPLACE FUNCTION public.submit_event_feedback(
  _event_id uuid,
  _anon_id text,
  _enjoyment smallint,
  _met_new_person boolean,
  _new_people_count smallint DEFAULT NULL::smallint,
  _keep_in_touch boolean DEFAULT false,
  _keep_in_touch_name text DEFAULT NULL::text,
  _attend_reason text DEFAULT NULL::text,
  _preferred_meetup_type text DEFAULT NULL::text,
  _meaningful_moment text DEFAULT NULL::text,
  _improvement text DEFAULT NULL::text,
  _next_event_likelihood smallint DEFAULT NULL::smallint,
  _nps smallint DEFAULT NULL::smallint,
  _membership_interest text DEFAULT NULL::text,
  _membership_fair_price text DEFAULT NULL::text,
  _membership_benefits text[] DEFAULT NULL::text[],
  _membership_benefits_other text DEFAULT NULL::text,
  _custom_answers jsonb DEFAULT '{}'::jsonb,
  _guest_name text DEFAULT NULL::text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  v_event_id uuid;
  v_form_id uuid;
  v_answers jsonb;
BEGIN
  SELECT id INTO v_event_id FROM public.events WHERE id = _event_id AND COALESCE(feedback_hidden, false) = false;
  IF v_event_id IS NULL THEN
    SELECT id INTO v_form_id FROM public.feedback_forms WHERE id = _event_id AND is_active;
  END IF;
  IF v_event_id IS NULL AND v_form_id IS NULL THEN
    RAISE EXCEPTION 'event not found';
  END IF;
  IF _enjoyment IS NULL OR _enjoyment < 1 OR _enjoyment > 5 THEN
    RAISE EXCEPTION 'invalid enjoyment';
  END IF;
  IF _nps IS NOT NULL AND (_nps < 0 OR _nps > 10) THEN
    RAISE EXCEPTION 'invalid nps';
  END IF;
  IF _next_event_likelihood IS NOT NULL AND (_next_event_likelihood < 1 OR _next_event_likelihood > 5) THEN
    RAISE EXCEPTION 'invalid likelihood';
  END IF;
  IF _membership_benefits IS NOT NULL AND array_length(_membership_benefits, 1) > 12 THEN
    RAISE EXCEPTION 'too many benefits';
  END IF;

  v_answers := COALESCE(_custom_answers, '{}'::jsonb);
  IF jsonb_typeof(v_answers) <> 'object' THEN
    v_answers := '{}'::jsonb;
  END IF;
  IF length(v_answers::text) > 20000 THEN
    RAISE EXCEPTION 'answers too large';
  END IF;

  INSERT INTO public.event_feedback (
    event_id, form_id, user_id, anon_id, enjoyment, met_new_person, new_people_count,
    keep_in_touch, keep_in_touch_name, attend_reason, preferred_meetup_type,
    meaningful_moment, improvement, next_event_likelihood, nps,
    membership_interest, membership_fair_price, membership_benefits, membership_benefits_other,
    custom_answers, guest_name
  ) VALUES (
    v_event_id, v_form_id, auth.uid(), NULLIF(_anon_id, ''), _enjoyment, COALESCE(_met_new_person, false), _new_people_count,
    COALESCE(_keep_in_touch, false), NULLIF(btrim(COALESCE(_keep_in_touch_name, '')), ''),
    NULLIF(btrim(COALESCE(_attend_reason, '')), ''), NULLIF(btrim(COALESCE(_preferred_meetup_type, '')), ''),
    NULLIF(btrim(COALESCE(_meaningful_moment, '')), ''), NULLIF(btrim(COALESCE(_improvement, '')), ''),
    _next_event_likelihood, _nps,
    NULLIF(btrim(COALESCE(_membership_interest, '')), ''),
    NULLIF(btrim(COALESCE(_membership_fair_price, '')), ''),
    COALESCE(_membership_benefits, '{}'::text[]),
    NULLIF(btrim(COALESCE(_membership_benefits_other, '')), ''),
    v_answers,
    NULLIF(btrim(COALESCE(_guest_name, '')), '')
  ) RETURNING id INTO new_id;

  RETURN new_id;
END $function$;

GRANT EXECUTE ON FUNCTION public.submit_event_feedback(uuid,text,smallint,boolean,smallint,boolean,text,text,text,text,text,smallint,smallint,text,text,text[],text,jsonb,text) TO anon, authenticated;