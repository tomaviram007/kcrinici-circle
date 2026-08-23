CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  anon_id text NOT NULL,
  user_id uuid,
  session_id text,
  event_type text NOT NULL,
  name text NOT NULL,
  path text,
  duration_ms integer,
  props jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT ALL ON public.analytics_events TO service_role;
GRANT SELECT ON public.analytics_events TO authenticated;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
ON public.analytics_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_analytics_events_created_at ON public.analytics_events (created_at DESC);
CREATE INDEX idx_analytics_events_user ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX idx_analytics_events_anon ON public.analytics_events (anon_id, created_at DESC);
CREATE INDEX idx_analytics_events_name ON public.analytics_events (event_type, name);

CREATE OR REPLACE FUNCTION public.track_event(
  _anon_id text,
  _session_id text,
  _event_type text,
  _name text,
  _path text DEFAULT NULL,
  _duration_ms integer DEFAULT NULL,
  _props jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _anon_id IS NULL OR length(_anon_id) < 6 OR length(_anon_id) > 64 THEN
    RETURN;
  END IF;
  IF _event_type NOT IN ('page_view','action','funnel') THEN
    RETURN;
  END IF;
  IF _name IS NULL OR length(_name) > 80 THEN
    RETURN;
  END IF;

  INSERT INTO public.analytics_events (anon_id, user_id, session_id, event_type, name, path, duration_ms, props)
  VALUES (
    _anon_id,
    auth.uid(),
    left(coalesce(_session_id,''), 64),
    _event_type,
    _name,
    left(coalesce(_path,''), 300),
    CASE WHEN _duration_ms BETWEEN 0 AND 7200000 THEN _duration_ms ELSE NULL END,
    COALESCE(_props, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_event(text,text,text,text,text,integer,jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_analytics_overview(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  _start timestamptz := now() - (GREATEST(COALESCE(_days,30),1) || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_events', (SELECT count(*) FROM analytics_events WHERE created_at >= _start),
    'page_views', (SELECT count(*) FROM analytics_events WHERE created_at >= _start AND event_type = 'page_view'),
    'unique_visitors', (SELECT count(DISTINCT anon_id) FROM analytics_events WHERE created_at >= _start),
    'logged_in_visitors', (SELECT count(DISTINCT user_id) FROM analytics_events WHERE created_at >= _start AND user_id IS NOT NULL),
    'daily', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d->>'day'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'day', to_char(date_trunc('day', created_at), 'YYYY-MM-DD'),
          'visitors', count(DISTINCT anon_id),
          'views', count(*) FILTER (WHERE event_type = 'page_view')
        ) AS d
        FROM analytics_events WHERE created_at >= _start
        GROUP BY date_trunc('day', created_at)
      ) x
    ),
    'top_pages', (
      SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'path', path,
          'views', count(*),
          'visitors', count(DISTINCT anon_id),
          'avg_seconds', ROUND(COALESCE(avg(duration_ms) FILTER (WHERE duration_ms IS NOT NULL), 0) / 1000.0, 1)
        ) AS d
        FROM analytics_events
        WHERE created_at >= _start AND event_type = 'page_view'
        GROUP BY path ORDER BY count(*) DESC LIMIT 20
      ) x
    ),
    'top_actions', (
      SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('name', name, 'count', count(*), 'users', count(DISTINCT anon_id)) AS d
        FROM analytics_events
        WHERE created_at >= _start AND event_type = 'action'
        GROUP BY name ORDER BY count(*) DESC LIMIT 20
      ) x
    ),
    'funnel', (
      SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('name', name, 'count', count(DISTINCT anon_id)) AS d
        FROM analytics_events
        WHERE created_at >= _start AND event_type = 'funnel'
        GROUP BY name ORDER BY count(DISTINCT anon_id) DESC
      ) x
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_visitors(_days integer DEFAULT 30, _limit integer DEFAULT 100)
RETURNS TABLE(
  anon_id text,
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  events_count bigint,
  page_views bigint,
  actions_count bigint,
  first_seen timestamptz,
  last_seen timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _start timestamptz := now() - (GREATEST(COALESCE(_days,30),1) || ' days')::interval;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      COALESCE(max(e.user_id::text), e.anon_id) AS grp,
      e.anon_id AS a_id,
      max(e.user_id) AS u_id,
      count(*) AS ev,
      count(*) FILTER (WHERE e.event_type = 'page_view') AS pv,
      count(*) FILTER (WHERE e.event_type = 'action') AS ac,
      min(e.created_at) AS fs,
      max(e.created_at) AS ls
    FROM analytics_events e
    WHERE e.created_at >= _start
    GROUP BY e.anon_id
  )
  SELECT a.a_id, a.u_id, p.full_name, p.avatar_url, u.email::text,
         a.ev, a.pv, a.ac, a.fs, a.ls
  FROM agg a
  LEFT JOIN profiles p ON p.user_id = a.u_id
  LEFT JOIN auth.users u ON u.id = a.u_id
  ORDER BY a.ls DESC
  LIMIT GREATEST(COALESCE(_limit,100),1);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_timeline(_anon_id text DEFAULT NULL, _user_id uuid DEFAULT NULL, _limit integer DEFAULT 300)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  event_type text,
  name text,
  path text,
  duration_ms integer,
  props jsonb,
  session_id text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _anon_id IS NULL AND _user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT e.id, e.created_at, e.event_type, e.name, e.path, e.duration_ms, e.props, e.session_id
  FROM analytics_events e
  WHERE (_user_id IS NOT NULL AND e.user_id = _user_id)
     OR (_user_id IS NULL AND e.anon_id = _anon_id)
  ORDER BY e.created_at DESC
  LIMIT GREATEST(COALESCE(_limit,300),1);
END;
$$;