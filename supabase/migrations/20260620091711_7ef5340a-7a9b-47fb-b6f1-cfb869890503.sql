
-- Track last alerted log entry so we don't double-alert
CREATE TABLE IF NOT EXISTS public.email_alert_state (
  id boolean PRIMARY KEY DEFAULT true,
  last_alerted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);
GRANT SELECT ON public.email_alert_state TO authenticated;
GRANT ALL ON public.email_alert_state TO service_role;
ALTER TABLE public.email_alert_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read alert state" ON public.email_alert_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.email_alert_state (id, last_alerted_at) VALUES (true, now()) ON CONFLICT DO NOTHING;

-- Admin RPC: paginated, filterable, deduplicated email log view
CREATE OR REPLACE FUNCTION public.admin_get_email_logs(
  _start timestamptz DEFAULT now() - interval '7 days',
  _end timestamptz DEFAULT now(),
  _template text DEFAULT NULL,
  _status text DEFAULT NULL,
  _search text DEFAULT NULL,
  _limit int DEFAULT 50,
  _offset int DEFAULT 0
)
RETURNS TABLE(
  message_id text, template_name text, recipient_email text,
  status text, error_message text, metadata jsonb, created_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id)
      l.message_id, l.template_name, l.recipient_email,
      l.status, l.error_message, l.metadata, l.created_at
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
    ORDER BY l.message_id, l.created_at DESC
  ),
  filtered AS (
    SELECT * FROM latest
    WHERE created_at >= _start AND created_at <= _end
      AND (_template IS NULL OR template_name = _template)
      AND (_status IS NULL OR status = _status)
      AND (_search IS NULL OR recipient_email ILIKE '%'||_search||'%' OR COALESCE(error_message,'') ILIKE '%'||_search||'%')
  )
  SELECT f.message_id, f.template_name, f.recipient_email, f.status,
         f.error_message, f.metadata, f.created_at,
         (SELECT count(*) FROM filtered)::bigint
  FROM filtered f
  ORDER BY f.created_at DESC
  LIMIT _limit OFFSET _offset;
END $$;

CREATE OR REPLACE FUNCTION public.admin_get_email_stats(
  _start timestamptz DEFAULT now() - interval '7 days',
  _end timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  WITH latest AS (
    SELECT DISTINCT ON (l.message_id) l.status, l.created_at
    FROM public.email_send_log l
    WHERE l.message_id IS NOT NULL
    ORDER BY l.message_id, l.created_at DESC
  ),
  scoped AS (
    SELECT status FROM latest WHERE created_at >= _start AND created_at <= _end
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM scoped),
    'sent', (SELECT count(*) FROM scoped WHERE status = 'sent'),
    'failed', (SELECT count(*) FROM scoped WHERE status IN ('failed','dlq','bounced')),
    'suppressed', (SELECT count(*) FROM scoped WHERE status IN ('suppressed','complained')),
    'pending', (SELECT count(*) FROM scoped WHERE status = 'pending'),
    'templates', (SELECT COALESCE(jsonb_agg(DISTINCT template_name), '[]'::jsonb) FROM (SELECT DISTINCT template_name FROM public.email_send_log WHERE template_name IS NOT NULL ORDER BY template_name) t)
  ) INTO result;
  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_get_email_logs(timestamptz, timestamptz, text, text, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_email_stats(timestamptz, timestamptz) TO authenticated;
