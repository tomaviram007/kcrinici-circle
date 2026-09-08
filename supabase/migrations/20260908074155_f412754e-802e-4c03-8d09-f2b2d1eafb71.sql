-- 1. helpers
CREATE OR REPLACE FUNCTION public.norm_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(
    CASE
      WHEN regexp_replace(COALESCE(_p,''), '\D', '', 'g') LIKE '972%'
        THEN '0' || substr(regexp_replace(COALESCE(_p,''), '\D', '', 'g'), 4)
      ELSE regexp_replace(COALESCE(_p,''), '\D', '', 'g')
    END, '');
$$;

CREATE OR REPLACE FUNCTION public.norm_email(_e text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(lower(btrim(COALESCE(_e,''))), '');
$$;

-- 2. community members
CREATE TABLE IF NOT EXISTS public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  phone_norm text GENERATED ALWAYS AS (public.norm_phone(phone)) STORED,
  email_norm text GENERATED ALWAYS AS (public.norm_email(email)) STORED,
  joined_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'guest',
  admin_notes text,
  -- future membership layer (not used yet)
  membership_status text NOT NULL DEFAULT 'none',
  membership_type text,
  membership_start date,
  membership_end date,
  membership_payment_status text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS community_members_user_id_key ON public.community_members(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS community_members_email_key ON public.community_members(email_norm) WHERE email_norm IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS community_members_phone_key ON public.community_members(phone_norm) WHERE phone_norm IS NOT NULL;

CREATE POLICY "Admins manage community members"
ON public.community_members FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Members see their own community record"
ON public.community_members FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER community_members_set_updated_at
BEFORE UPDATE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. attendance
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.community_members(id) ON DELETE CASCADE,
  user_id uuid,
  source text NOT NULL DEFAULT 'qr',
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendance TO authenticated;
GRANT ALL ON public.event_attendance TO service_role;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS event_attendance_unique ON public.event_attendance(event_id, member_id);
CREATE INDEX IF NOT EXISTS event_attendance_member_idx ON public.event_attendance(member_id);

CREATE POLICY "Admins manage attendance"
ON public.event_attendance FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see their own attendance"
ON public.event_attendance FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 4. link feedback to member
ALTER TABLE public.event_feedback ADD COLUMN IF NOT EXISTS member_id uuid REFERENCES public.community_members(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS event_feedback_member_idx ON public.event_feedback(member_id);

-- 5. backfill from profiles (approved members first)
INSERT INTO public.community_members (user_id, full_name, phone, email, joined_at, status)
SELECT DISTINCT ON (public.norm_email(u.email::text))
  p.user_id,
  COALESCE(NULLIF(btrim(p.full_name), ''), split_part(u.email::text, '@', 1)),
  p.phone,
  u.email::text,
  p.created_at,
  CASE WHEN p.is_approved THEN 'member' ELSE 'pending' END
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.is_removed = false
ORDER BY public.norm_email(u.email::text), p.created_at
ON CONFLICT DO NOTHING;

-- 6. backfill from event registrations (guests)
INSERT INTO public.community_members (full_name, phone, email, joined_at, status)
SELECT DISTINCT ON (public.norm_email(r.email))
  btrim(r.first_name || ' ' || r.last_name), r.phone, r.email, min(r.created_at) OVER (PARTITION BY public.norm_email(r.email)), 'guest'
FROM public.event_registrations r
WHERE public.norm_email(r.email) IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.community_members m WHERE m.email_norm = public.norm_email(r.email))
ORDER BY public.norm_email(r.email), r.created_at
ON CONFLICT DO NOTHING;

-- 7. resolve-or-create member
CREATE OR REPLACE FUNCTION public.resolve_community_member(_user_id uuid, _full_name text, _email text, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_email text := public.norm_email(_email);
  v_phone text := public.norm_phone(_phone);
  v_name text := NULLIF(btrim(COALESCE(_full_name,'')), '');
BEGIN
  IF _user_id IS NOT NULL THEN
    SELECT id INTO v_id FROM public.community_members WHERE user_id = _user_id;
    IF v_id IS NULL AND v_email IS NOT NULL THEN
      SELECT id INTO v_id FROM public.community_members WHERE email_norm = v_email;
    END IF;
    IF v_id IS NULL THEN
      SELECT p.full_name, u.email::text, p.phone
        INTO v_name, _email, _phone
      FROM public.profiles p JOIN auth.users u ON u.id = p.user_id
      WHERE p.user_id = _user_id;
      v_email := COALESCE(public.norm_email(_email), v_email);
      v_phone := COALESCE(public.norm_phone(_phone), v_phone);
      SELECT id INTO v_id FROM public.community_members WHERE email_norm = v_email AND v_email IS NOT NULL;
    END IF;
    IF v_id IS NULL THEN
      INSERT INTO public.community_members(user_id, full_name, email, phone, status)
      VALUES (_user_id, COALESCE(v_name,''), _email, _phone, 'member')
      RETURNING id INTO v_id;
    ELSE
      UPDATE public.community_members
      SET user_id = COALESCE(user_id, _user_id),
          full_name = CASE WHEN btrim(COALESCE(full_name,'')) = '' THEN COALESCE(v_name, full_name) ELSE full_name END,
          phone = COALESCE(phone, _phone),
          email = COALESCE(email, _email)
      WHERE id = v_id;
    END IF;
    RETURN v_id;
  END IF;

  IF v_email IS NOT NULL THEN
    SELECT id INTO v_id FROM public.community_members WHERE email_norm = v_email;
  END IF;
  IF v_id IS NULL AND v_phone IS NOT NULL THEN
    SELECT id INTO v_id FROM public.community_members WHERE phone_norm = v_phone;
  END IF;

  IF v_id IS NULL THEN
    IF v_email IS NULL AND v_phone IS NULL THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.community_members(full_name, email, phone, status)
    VALUES (COALESCE(v_name,''), _email, _phone, 'guest')
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.community_members
    SET full_name = CASE WHEN btrim(COALESCE(full_name,'')) = '' THEN COALESCE(v_name, full_name) ELSE full_name END,
        phone = COALESCE(phone, _phone),
        email = COALESCE(email, _email)
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

-- 8. QR check-in
CREATE OR REPLACE FUNCTION public.checkin_event(_event_id uuid, _full_name text DEFAULT NULL, _email text DEFAULT NULL, _phone text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member uuid;
  v_event record;
  v_already boolean := false;
  v_prior int;
BEGIN
  SELECT id, title, event_date INTO v_event FROM public.events WHERE id = _event_id;
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  v_member := public.resolve_community_member(auth.uid(), _full_name, _email, _phone);
  IF v_member IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'identify_required', 'event_title', v_event.title);
  END IF;

  SELECT count(*) INTO v_prior FROM public.event_attendance
  WHERE member_id = v_member AND event_id <> _event_id;

  IF EXISTS (SELECT 1 FROM public.event_attendance WHERE event_id = _event_id AND member_id = v_member) THEN
    v_already := true;
  ELSE
    INSERT INTO public.event_attendance(event_id, member_id, user_id, source)
    VALUES (_event_id, v_member, auth.uid(), 'qr')
    ON CONFLICT (event_id, member_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'already', v_already,
    'member_id', v_member,
    'returning', v_prior > 0,
    'event_title', v_event.title,
    'event_date', v_event.event_date
  );
END $$;

-- 9. attach member to feedback automatically
CREATE OR REPLACE FUNCTION public.event_feedback_attach_member()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.member_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.member_id := public.resolve_community_member(NEW.user_id, NULL, NULL, NULL);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_event_feedback_attach_member ON public.event_feedback;
CREATE TRIGGER trg_event_feedback_attach_member
BEFORE INSERT ON public.event_feedback
FOR EACH ROW EXECUTE FUNCTION public.event_feedback_attach_member();

UPDATE public.event_feedback f
SET member_id = m.id
FROM public.community_members m
WHERE f.member_id IS NULL AND f.user_id IS NOT NULL AND m.user_id = f.user_id;

-- 10. admin: per-event engagement stats
CREATE OR REPLACE FUNCTION public.admin_event_engagement(_event_id uuid DEFAULT NULL, _limit int DEFAULT 50)
RETURNS TABLE(
  event_id uuid, title text, event_date timestamptz,
  registered bigint, attended bigint, attendance_pct numeric,
  new_attendees bigint, returning_attendees bigint, returning_pct numeric,
  feedback_count bigint, feedback_pct numeric, avg_enjoyment numeric,
  met_new_count bigint, want_return_count bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH ev AS (
    SELECT e.id, e.title, e.event_date FROM public.events e
    WHERE (_event_id IS NULL OR e.id = _event_id)
    ORDER BY e.event_date DESC
    LIMIT GREATEST(COALESCE(_limit,50),1)
  ),
  att AS (
    SELECT a.event_id, a.member_id,
      EXISTS (
        SELECT 1 FROM public.event_attendance a2
        JOIN public.events e2 ON e2.id = a2.event_id
        JOIN public.events e1 ON e1.id = a.event_id
        WHERE a2.member_id = a.member_id AND a2.event_id <> a.event_id AND e2.event_date < e1.event_date
      ) AS is_returning
    FROM public.event_attendance a
    WHERE a.event_id IN (SELECT id FROM ev)
  )
  SELECT
    ev.id, ev.title, ev.event_date,
    COALESCE(reg.c, 0),
    COALESCE(at.c, 0),
    CASE WHEN COALESCE(reg.c,0) = 0 THEN 0 ELSE round(100.0 * COALESCE(at.c,0) / reg.c, 0) END,
    COALESCE(at.new_c, 0),
    COALESCE(at.ret_c, 0),
    CASE WHEN COALESCE(at.c,0) = 0 THEN 0 ELSE round(100.0 * COALESCE(at.ret_c,0) / at.c, 0) END,
    COALESCE(fb.c, 0),
    CASE WHEN COALESCE(at.c,0) = 0 THEN 0 ELSE round(100.0 * COALESCE(fb.c,0) / at.c, 0) END,
    fb.avg_enj,
    COALESCE(fb.met_new, 0),
    COALESCE(fb.want_return, 0)
  FROM ev
  LEFT JOIN LATERAL (
    SELECT (
      (SELECT count(*) FROM public.event_rsvps r WHERE r.event_id = ev.id AND r.status = 'attending')
      + (SELECT count(*) FROM public.event_registrations g WHERE g.event_id = ev.id
          AND (g.user_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.event_rsvps r2 WHERE r2.event_id = ev.id AND r2.user_id = g.user_id AND r2.status = 'attending')))
    )::bigint AS c
  ) reg ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS c,
           count(*) FILTER (WHERE NOT att.is_returning)::bigint AS new_c,
           count(*) FILTER (WHERE att.is_returning)::bigint AS ret_c
    FROM att WHERE att.event_id = ev.id
  ) at ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS c,
           round(avg(f.enjoyment)::numeric, 2) AS avg_enj,
           count(*) FILTER (WHERE f.met_new_person)::bigint AS met_new,
           count(*) FILTER (WHERE f.next_event_likelihood >= 4)::bigint AS want_return
    FROM public.event_feedback f WHERE f.event_id = ev.id
  ) fb ON true
  ORDER BY ev.event_date DESC;
END $$;

-- 11. admin: community members list
CREATE OR REPLACE FUNCTION public.admin_community_members(_search text DEFAULT NULL, _limit int DEFAULT 500)
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, phone text, email text,
  joined_at timestamptz, status text, membership_status text, admin_notes text,
  events_registered bigint, events_attended bigint, last_event_at timestamptz,
  last_event_title text, feedback_count bigint, membership_interest text,
  membership_fair_price text, avatar_url text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT m.id, m.user_id, m.full_name, m.phone, m.email, m.joined_at, m.status,
         m.membership_status, m.admin_notes,
         COALESCE(reg.c, 0), COALESCE(att.c, 0), att.last_at, att.last_title,
         COALESCE(fb.c, 0), fb.interest, fb.price, p.avatar_url
  FROM public.community_members m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS c FROM public.event_registrations r
    WHERE (m.user_id IS NOT NULL AND r.user_id = m.user_id)
       OR (m.email_norm IS NOT NULL AND public.norm_email(r.email) = m.email_norm)
  ) reg ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS c, max(e.event_date) AS last_at,
           (SELECT e2.title FROM public.event_attendance a2 JOIN public.events e2 ON e2.id = a2.event_id
             WHERE a2.member_id = m.id ORDER BY e2.event_date DESC LIMIT 1) AS last_title
    FROM public.event_attendance a JOIN public.events e ON e.id = a.event_id
    WHERE a.member_id = m.id
  ) att ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint AS c,
           (SELECT f2.membership_interest FROM public.event_feedback f2
             WHERE f2.member_id = m.id AND f2.membership_interest IS NOT NULL
             ORDER BY f2.created_at DESC LIMIT 1) AS interest,
           (SELECT f3.membership_fair_price FROM public.event_feedback f3
             WHERE f3.member_id = m.id AND f3.membership_fair_price IS NOT NULL
             ORDER BY f3.created_at DESC LIMIT 1) AS price
    FROM public.event_feedback f WHERE f.member_id = m.id
  ) fb ON true
  WHERE _search IS NULL OR _search = ''
     OR m.full_name ILIKE '%'||_search||'%'
     OR COALESCE(m.email,'') ILIKE '%'||_search||'%'
     OR COALESCE(m.phone,'') ILIKE '%'||_search||'%'
  ORDER BY att.last_at DESC NULLS LAST, m.joined_at DESC
  LIMIT GREATEST(COALESCE(_limit,500),1);
END $$;

-- 12. admin: single member detail
CREATE OR REPLACE FUNCTION public.admin_community_member_detail(_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'member', to_jsonb(m) - 'phone_norm' - 'email_norm',
    'attendance', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'event_id', e.id, 'title', e.title, 'event_date', e.event_date,
        'checked_in_at', a.checked_in_at) ORDER BY e.event_date DESC), '[]'::jsonb)
      FROM public.event_attendance a JOIN public.events e ON e.id = a.event_id
      WHERE a.member_id = m.id
    ),
    'registrations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'event_id', e.id, 'title', e.title, 'event_date', e.event_date,
        'payment_status', r.payment_status) ORDER BY e.event_date DESC), '[]'::jsonb)
      FROM public.event_registrations r JOIN public.events e ON e.id = r.event_id
      WHERE (m.user_id IS NOT NULL AND r.user_id = m.user_id)
         OR (m.email_norm IS NOT NULL AND public.norm_email(r.email) = m.email_norm)
    ),
    'feedback', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', f.id, 'created_at', f.created_at,
        'title', COALESCE(e.title, ff.title),
        'enjoyment', f.enjoyment, 'nps', f.nps,
        'met_new_person', f.met_new_person,
        'preferred_meetup_type', f.preferred_meetup_type,
        'meaningful_moment', f.meaningful_moment,
        'improvement', f.improvement,
        'membership_interest', f.membership_interest,
        'membership_fair_price', f.membership_fair_price,
        'membership_benefits', f.membership_benefits
      ) ORDER BY f.created_at DESC), '[]'::jsonb)
      FROM public.event_feedback f
      LEFT JOIN public.events e ON e.id = f.event_id
      LEFT JOIN public.feedback_forms ff ON ff.id = f.form_id
      WHERE f.member_id = m.id
    )
  ) INTO result
  FROM public.community_members m WHERE m.id = _member_id;

  RETURN COALESCE(result, '{}'::jsonb);
END $$;