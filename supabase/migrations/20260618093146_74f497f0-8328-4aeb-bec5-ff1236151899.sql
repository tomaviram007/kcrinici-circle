
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS email_opt_in boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS send_birthday_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_birthday_list boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.birthday_email_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL DEFAULT 'מזל טוב ליום הולדתך! 🎂',
  body_html text NOT NULL DEFAULT '<p>שלום {{first_name}},</p><p>בשם מועדון הגברים של קריית קריניצי - מאחלים לך יום הולדת שמח, בריאות, אושר והרבה הצלחה!</p><p>נשמח לראותך באירועי המועדון הקרובים.</p><p>בברכה,<br/>צוות המועדון</p>',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.birthday_email_template TO authenticated;
GRANT ALL ON public.birthday_email_template TO service_role;
ALTER TABLE public.birthday_email_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read birthday template" ON public.birthday_email_template
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage birthday template" ON public.birthday_email_template
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.birthday_email_template (subject, body_html)
  SELECT 'מזל טוב ליום הולדתך! 🎂',
    '<p>שלום {{first_name}},</p><p>בשם מועדון הגברים של קריית קריניצי - מאחלים לך יום הולדת שמח, בריאות, אושר והרבה הצלחה!</p><p>נשמח לראותך באירועי המועדון הקרובים.</p><p>בברכה,<br/>צוות המועדון</p>'
  WHERE NOT EXISTS (SELECT 1 FROM public.birthday_email_template);

CREATE TABLE IF NOT EXISTS public.birthday_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipient_email text NOT NULL,
  sent_year int NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  error_message text,
  resend_id text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sent_year)
);

GRANT SELECT ON public.birthday_email_log TO authenticated;
GRANT ALL ON public.birthday_email_log TO service_role;
ALTER TABLE public.birthday_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read birthday email log" ON public.birthday_email_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_settings (key, value)
  SELECT 'birthday_whatsapp_group_url', '""'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key='birthday_whatsapp_group_url');
INSERT INTO public.site_settings (key, value)
  SELECT 'birthday_whatsapp_manager_phone', '""'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key='birthday_whatsapp_manager_phone');

CREATE OR REPLACE FUNCTION public.get_birthdays_for_date(_month int, _day int)
RETURNS TABLE (
  user_id uuid, first_name text, full_name text, display_name text,
  email text, phone text,
  send_birthday_email boolean, email_opt_in boolean, is_approved boolean
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id,
    COALESCE(p.first_name, split_part(p.full_name, ' ', 1)),
    p.full_name,
    COALESCE(p.display_name, p.full_name),
    u.email::text, p.phone,
    p.send_birthday_email, p.email_opt_in, p.is_approved
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.birth_date IS NOT NULL AND p.is_removed = false
    AND EXTRACT(MONTH FROM p.birth_date)::int = _month
    AND EXTRACT(DAY FROM p.birth_date)::int = _day
$$;

REVOKE ALL ON FUNCTION public.get_birthdays_for_date(int, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_birthdays_for_date(int, int) TO service_role;

CREATE OR REPLACE FUNCTION public.get_birthdays_in_month(_month int)
RETURNS TABLE (
  user_id uuid, first_name text, full_name text, display_name text,
  email text, phone text, birth_date date,
  send_birthday_email boolean, email_opt_in boolean,
  show_in_birthday_list boolean, is_approved boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT p.user_id,
    COALESCE(p.first_name, split_part(p.full_name, ' ', 1)),
    p.full_name,
    COALESCE(p.display_name, p.full_name),
    u.email::text, p.phone, p.birth_date,
    p.send_birthday_email, p.email_opt_in,
    p.show_in_birthday_list, p.is_approved
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.birth_date IS NOT NULL AND p.is_removed = false
    AND EXTRACT(MONTH FROM p.birth_date)::int = _month
  ORDER BY EXTRACT(DAY FROM p.birth_date);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_birthdays_in_month(int) TO authenticated;
