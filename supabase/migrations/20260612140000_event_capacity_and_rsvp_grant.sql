-- RSVP exposure cleanup: anon has no RLS policy that matches event_rsvps
-- rows, so this grant is unnecessary surface; events stay publicly readable.
REVOKE SELECT ON public.event_rsvps FROM anon;
