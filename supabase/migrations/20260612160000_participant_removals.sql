-- Audit log of participants removed from events by admins
CREATE TABLE public.event_participant_removals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  event_title TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'registration' CHECK (source IN ('registration', 'rsvp')),
  payment_status TEXT,
  reason TEXT NOT NULL,
  removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_participant_removals_event_id ON public.event_participant_removals (event_id);

ALTER TABLE public.event_participant_removals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.event_participant_removals TO authenticated;
GRANT ALL ON public.event_participant_removals TO service_role;

CREATE POLICY "Admins can view removals"
ON public.event_participant_removals FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert removals"
ON public.event_participant_removals FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = removed_by);
