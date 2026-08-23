CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid,
  anon_id text,
  enjoyment smallint NOT NULL,
  met_new_person boolean NOT NULL DEFAULT false,
  new_people_count smallint,
  keep_in_touch boolean NOT NULL DEFAULT false,
  keep_in_touch_name text,
  attend_reason text,
  preferred_meetup_type text,
  meaningful_moment text,
  improvement text,
  next_event_likelihood smallint,
  nps smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_feedback_event ON public.event_feedback(event_id);
CREATE INDEX idx_event_feedback_created ON public.event_feedback(created_at DESC);

GRANT SELECT, DELETE ON public.event_feedback TO authenticated;
GRANT ALL ON public.event_feedback TO service_role;

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view event feedback"
ON public.event_feedback FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event feedback"
ON public.event_feedback FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.submit_event_feedback(
  _event_id uuid,
  _anon_id text,
  _enjoyment smallint,
  _met_new_person boolean,
  _new_people_count smallint DEFAULT NULL,
  _keep_in_touch boolean DEFAULT false,
  _keep_in_touch_name text DEFAULT NULL,
  _attend_reason text DEFAULT NULL,
  _preferred_meetup_type text DEFAULT NULL,
  _meaningful_moment text DEFAULT NULL,
  _improvement text DEFAULT NULL,
  _next_event_likelihood smallint DEFAULT NULL,
  _nps smallint DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.events WHERE id = _event_id) THEN
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
  IF _new_people_count IS NOT NULL AND (_new_people_count < 0 OR _new_people_count > 100) THEN
    RAISE EXCEPTION 'invalid count';
  END IF;

  INSERT INTO public.event_feedback (
    event_id, user_id, anon_id, enjoyment, met_new_person, new_people_count,
    keep_in_touch, keep_in_touch_name, attend_reason, preferred_meetup_type,
    meaningful_moment, improvement, next_event_likelihood, nps
  ) VALUES (
    _event_id, auth.uid(), left(coalesce(_anon_id,''), 64), _enjoyment, coalesce(_met_new_person,false),
    _new_people_count, coalesce(_keep_in_touch,false), left(_keep_in_touch_name, 120),
    left(_attend_reason, 120), left(_preferred_meetup_type, 120),
    left(_meaningful_moment, 1000), left(_improvement, 1000),
    _next_event_likelihood, _nps
  ) RETURNING id INTO new_id;

  RETURN new_id;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_event_feedback(uuid, text, smallint, boolean, smallint, boolean, text, text, text, text, text, smallint, smallint) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_event_feedback_summary(
  _event_id uuid DEFAULT NULL,
  _start timestamptz DEFAULT NULL,
  _end timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH scoped AS (
    SELECT f.* FROM public.event_feedback f
    WHERE (_event_id IS NULL OR f.event_id = _event_id)
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
    'by_event', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                     'event_id', t.event_id, 'title', t.title, 'event_date', t.event_date,
                     'total', t.total, 'avg_enjoyment', t.avg_enjoyment) ORDER BY t.event_date DESC), '[]'::jsonb)
                 FROM (SELECT s.event_id, e.title, e.event_date, count(*) total,
                              round(avg(s.enjoyment)::numeric, 2) avg_enjoyment
                       FROM scoped s JOIN public.events e ON e.id = s.event_id
                       GROUP BY s.event_id, e.title, e.event_date) t)
  ) INTO result;

  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_event_feedback_summary(uuid, timestamptz, timestamptz) TO authenticated;