
-- Add payment link and registration toggle to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_required boolean NOT NULL DEFAULT false;

-- Add payment status to RSVPs
ALTER TABLE public.event_rsvps ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_required';

-- Allow team members with manage_events permission to manage events
CREATE POLICY "Team with permission can manage events"
ON public.events FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'manage_events'))
WITH CHECK (has_permission(auth.uid(), 'manage_events'));

-- Allow team with permission to manage RSVPs
CREATE POLICY "Team with permission can manage RSVPs"
ON public.event_rsvps FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'manage_events'))
WITH CHECK (has_permission(auth.uid(), 'manage_events'));
