
-- Admin policies on suppressed_emails
CREATE POLICY "Admins manage suppressed emails"
  ON public.suppressed_emails FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppressed_emails TO authenticated;

-- Admin policies on email_unsubscribe_tokens
CREATE POLICY "Admins read unsubscribe tokens"
  ON public.email_unsubscribe_tokens FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.email_unsubscribe_tokens TO authenticated;

-- Toggle opt-in
CREATE OR REPLACE FUNCTION public.admin_set_email_opt_in(_user_id uuid, _opt_in boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.profiles SET email_opt_in = _opt_in, updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Remove suppression
CREATE OR REPLACE FUNCTION public.admin_remove_suppression(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.suppressed_emails WHERE lower(email) = lower(_email);
  -- Also re-enable opt-in on matching profile
  UPDATE public.profiles SET email_opt_in = true, updated_at = now()
  WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = lower(_email));
END;
$$;

-- Mailing list listing
CREATE OR REPLACE FUNCTION public.admin_list_mailing_list()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  is_approved boolean,
  email_opt_in boolean,
  is_suppressed boolean,
  suppression_reason text,
  suppressed_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.full_name,
    p.is_approved,
    p.email_opt_in,
    (s.email IS NOT NULL) AS is_suppressed,
    s.reason,
    s.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.suppressed_emails s ON lower(s.email) = lower(u.email::text)
  WHERE p.is_removed = false
  ORDER BY p.full_name;
END;
$$;

-- Suppression helper (used by edge function with anon caller — but SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.mark_email_suppressed(_email text, _reason text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _reason NOT IN ('unsubscribe','bounce','complaint') THEN
    RAISE EXCEPTION 'invalid reason';
  END IF;
  INSERT INTO public.suppressed_emails(email, reason, metadata)
  VALUES (lower(_email), _reason, COALESCE(_metadata, '{}'::jsonb))
  ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason, metadata = EXCLUDED.metadata;

  -- Flip profile flag if found
  UPDATE public.profiles SET email_opt_in = false, updated_at = now()
  WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = lower(_email));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_email_opt_in(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_suppression(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_mailing_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_email_suppressed(text, text, jsonb) TO service_role;
