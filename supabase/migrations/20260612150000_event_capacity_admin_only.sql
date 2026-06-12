-- Participant limit + admin-only (test) events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_participants INTEGER CHECK (max_participants > 0);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_admin_only BOOLEAN NOT NULL DEFAULT false;

-- Hide admin-only events from non-admins (admins still see them via "Admins can manage events")
DROP POLICY IF EXISTS "Anyone can read events" ON public.events;
CREATE POLICY "Anyone can read public events"
ON public.events FOR SELECT
USING (is_admin_only = false);

-- Combined participant count: attending RSVPs + form registrations,
-- without double-counting members who have both
CREATE OR REPLACE FUNCTION public.get_event_participant_counts(_event_ids uuid[])
RETURNS TABLE(event_id uuid, participant_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id,
    (
      (SELECT count(*) FROM public.event_rsvps r
        WHERE r.event_id = e.id AND r.status = 'attending')
      +
      (SELECT count(*) FROM public.event_registrations g
        WHERE g.event_id = e.id
          AND (g.user_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.event_rsvps r2
            WHERE r2.event_id = e.id AND r2.user_id = g.user_id AND r2.status = 'attending')))
    )::bigint
  FROM public.events e
  WHERE e.id = ANY(_event_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_event_participant_counts(uuid[]) TO authenticated, anon;

-- Enforce capacity at the database level
CREATE OR REPLACE FUNCTION public.enforce_event_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap INTEGER;
  cnt BIGINT;
BEGIN
  SELECT max_participants INTO cap FROM public.events WHERE id = NEW.event_id;
  IF cap IS NULL THEN
    RETURN NEW;
  END IF;

  -- A member converting their form registration into an RSVP doesn't take a new spot
  IF TG_TABLE_NAME = 'event_rsvps' AND EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = NEW.event_id AND user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  SELECT participant_count INTO cnt
  FROM public.get_event_participant_counts(ARRAY[NEW.event_id]);
  IF cnt >= cap THEN
    RAISE EXCEPTION 'EVENT_FULL';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_registration_capacity ON public.event_registrations;
CREATE TRIGGER check_registration_capacity
  BEFORE INSERT ON public.event_registrations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_event_capacity();

DROP TRIGGER IF EXISTS check_rsvp_capacity ON public.event_rsvps;
CREATE TRIGGER check_rsvp_capacity
  BEFORE INSERT ON public.event_rsvps
  FOR EACH ROW
  WHEN (NEW.status = 'attending')
  EXECUTE FUNCTION public.enforce_event_capacity();
