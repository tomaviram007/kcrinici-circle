ALTER TABLE public.event_feedback
  ADD COLUMN membership_interest text,
  ADD COLUMN membership_fair_price text,
  ADD COLUMN membership_benefits text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN membership_benefits_other text;

CREATE OR REPLACE FUNCTION public.submit_event_feedback(_event_id uuid, _anon_id text, _enjoyment smallint, _met_new_person boolean, _new_people_count smallint DEFAULT NULL::smallint, _keep_in_touch boolean DEFAULT false, _keep_in_touch_name text DEFAULT NULL::text, _attend_reason text DEFAULT NULL::text, _preferred_meetup_type text DEFAULT NULL::text, _meaningful_moment text DEFAULT NULL::text, _improvement text DEFAULT NULL::text, _next_event_likelihood smallint DEFAULT NULL::smallint, _nps smallint DEFAULT NULL::smallint, _membership_interest text DEFAULT NULL::text, _membership_fair_price text DEFAULT NULL::text, _membership_benefits text[] DEFAULT NULL::text[], _membership_benefits_other text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_id uuid;
  v_event_id uuid;
  v_form_id uuid;
BEGIN
  SELECT id INTO v_event_id FROM public.events WHERE id = _event_id;
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

  INSERT INTO public.event_feedback (
    event_id, form_id, user_id, anon_id, enjoyment, met_new_person, new_people_count,
    keep_in_touch, keep_in_touch_name, attend_reason, preferred_meetup_type,
    meaningful_moment, improvement, next_event_likelihood, nps,
    membership_interest, membership_fair_price, membership_benefits, membership_benefits_other
  ) VALUES (
    v_event_id, v_form_id, auth.uid(), NULLIF(_anon_id, ''), _enjoyment, COALESCE(_met_new_person, false), _new_people_count,
    COALESCE(_keep_in_touch, false), NULLIF(btrim(COALESCE(_keep_in_touch_name, '')), ''),
    NULLIF(btrim(COALESCE(_attend_reason, '')), ''), NULLIF(btrim(COALESCE(_preferred_meetup_type, '')), ''),
    NULLIF(btrim(COALESCE(_meaningful_moment, '')), ''), NULLIF(btrim(COALESCE(_improvement, '')), ''),
    _next_event_likelihood, _nps,
    NULLIF(btrim(COALESCE(_membership_interest, '')), ''),
    NULLIF(btrim(COALESCE(_membership_fair_price, '')), ''),
    COALESCE(_membership_benefits, '{}'::text[]),
    NULLIF(btrim(COALESCE(_membership_benefits_other, '')), '')
  ) RETURNING id INTO new_id;

  RETURN new_id;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_event_feedback_summary(_event_id uuid DEFAULT NULL::uuid, _start timestamp with time zone DEFAULT NULL::timestamp with time zone, _end timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH scoped AS (
    SELECT f.* FROM public.event_feedback f
    WHERE (_event_id IS NULL OR f.event_id = _event_id OR f.form_id = _event_id)
      AND (_start IS NULL OR f.created_at >= _start)
      AND (_end IS NULL OR f.created_at <= _end)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM scoped),
    'avg_enjoyment', (SELECT round(avg(enjoyment)::numeric, 2) FROM scoped),
    'met_new_pct', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE met_new_person) / count(*), 0) END FROM scoped),
    'keep_in_touch_pct', (SELECT CASE WHEN count(*) = 0 THEN 0 ELSE round(100.0 * count(*) FILTER (WHERE keep_in_touch) / count(*), 0) END FROM scoped),
    'return_pct', (SELECT CASE WHEN count(*) FILTER (WHERE next_event_likelihood IS NOT NULL) = 0 THEN 0
                        ELSE round(100.0 * count(*) FILTER (WHERE next_event_likelihood >= 4) / count(*) FILTER (WHERE next_event_likelihood IS NOT NULL), 0) END FROM scoped),
    'avg_new_people', (SELECT round(avg(new_people_count)::numeric, 1) FROM scoped WHERE new_people_count IS NOT NULL),
    'nps', (SELECT CASE WHEN count(*) FILTER (WHERE nps IS NOT NULL) = 0 THEN NULL
                   ELSE round(100.0 * (count(*) FILTER (WHERE nps >= 9) - count(*) FILTER (WHERE nps <= 6))
                        / count(*) FILTER (WHERE nps IS NOT NULL), 0) END FROM scoped),
    'avg_nps', (SELECT round(avg(nps)::numeric, 1) FROM scoped WHERE nps IS NOT NULL),
    'meetup_types', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.preferred_meetup_type, 'count', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                     FROM (SELECT preferred_meetup_type, count(*) c FROM scoped
                           WHERE preferred_meetup_type IS NOT NULL AND preferred_meetup_type <> ''
                           GROUP BY preferred_meetup_type) t),
    'attend_reasons', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.attend_reason, 'count', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                       FROM (SELECT attend_reason, count(*) c FROM scoped
                             WHERE attend_reason IS NOT NULL AND attend_reason <> ''
                             GROUP BY attend_reason) t),
    'membership', jsonb_build_object(
      'respondents', (SELECT count(*) FROM scoped WHERE membership_interest IS NOT NULL),
      'positive_pct', (SELECT CASE WHEN count(*) FILTER (WHERE membership_interest IS NOT NULL) = 0 THEN 0
                            ELSE round(100.0 * count(*) FILTER (WHERE membership_interest IN ('בהחלט כן','כנראה שכן'))
                                 / count(*) FILTER (WHERE membership_interest IS NOT NULL), 0) END FROM scoped),
      'interest', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.membership_interest, 'count', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                   FROM (SELECT membership_interest, count(*) c FROM scoped
                         WHERE membership_interest IS NOT NULL GROUP BY membership_interest) t),
      'prices', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.membership_fair_price, 'count', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                 FROM (SELECT membership_fair_price, count(*) c FROM scoped
                       WHERE membership_fair_price IS NOT NULL GROUP BY membership_fair_price) t),
      'benefits', (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', t.b, 'count', t.c) ORDER BY t.c DESC), '[]'::jsonb)
                   FROM (SELECT b, count(*) c FROM scoped s, unnest(s.membership_benefits) b GROUP BY b) t),
      'other_notes', (SELECT COALESCE(jsonb_agg(t.membership_benefits_other), '[]'::jsonb)
                      FROM (SELECT membership_benefits_other FROM scoped
                            WHERE membership_benefits_other IS NOT NULL ORDER BY created_at DESC LIMIT 50) t),
      'by_event', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                       'event_id', t.target_id, 'title', t.title,
                       'respondents', t.respondents, 'positive_pct', t.positive_pct) ORDER BY t.respondents DESC), '[]'::jsonb)
                   FROM (SELECT COALESCE(s.event_id, s.form_id) AS target_id,
                                COALESCE(e.title, ff.title) AS title,
                                count(*) FILTER (WHERE s.membership_interest IS NOT NULL) AS respondents,
                                CASE WHEN count(*) FILTER (WHERE s.membership_interest IS NOT NULL) = 0 THEN 0
                                     ELSE round(100.0 * count(*) FILTER (WHERE s.membership_interest IN ('בהחלט כן','כנראה שכן'))
                                          / count(*) FILTER (WHERE s.membership_interest IS NOT NULL), 0) END AS positive_pct
                         FROM scoped s
                         LEFT JOIN public.events e ON e.id = s.event_id
                         LEFT JOIN public.feedback_forms ff ON ff.id = s.form_id
                         GROUP BY 1, 2
                         HAVING count(*) FILTER (WHERE s.membership_interest IS NOT NULL) > 0) t)
    ),
    'by_event', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'event_id', t.target_id, 'title', t.title, 'event_date', t.event_date,
                     'total', t.total, 'avg_enjoyment', t.avg_enjoyment) ORDER BY t.event_date DESC), '[]'::jsonb)
                 FROM (SELECT COALESCE(s.event_id, s.form_id) AS target_id,
                              COALESCE(e.title, ff.title) AS title,
                              COALESCE(e.event_date, ff.form_date) AS event_date,
                              count(*) total,
                              round(avg(s.enjoyment)::numeric, 2) avg_enjoyment
                       FROM scoped s
                       LEFT JOIN public.events e ON e.id = s.event_id
                       LEFT JOIN public.feedback_forms ff ON ff.id = s.form_id
                       GROUP BY 1, 2, 3) t)
  ) INTO result;

  RETURN result;
END $function$;