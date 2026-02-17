
-- Add image_url column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create RSVP table
CREATE TABLE public.event_rsvps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'maybe', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Anyone approved can view RSVPs
CREATE POLICY "Approved users can view RSVPs"
  ON public.event_rsvps FOR SELECT
  USING (public.is_approved_user(auth.uid()));

-- Users can insert their own RSVP
CREATE POLICY "Users can RSVP"
  ON public.event_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_approved_user(auth.uid()));

-- Users can update their own RSVP
CREATE POLICY "Users can update own RSVP"
  ON public.event_rsvps FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own RSVP
CREATE POLICY "Users can delete own RSVP"
  ON public.event_rsvps FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all RSVPs
CREATE POLICY "Admins can manage all RSVPs"
  ON public.event_rsvps FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
