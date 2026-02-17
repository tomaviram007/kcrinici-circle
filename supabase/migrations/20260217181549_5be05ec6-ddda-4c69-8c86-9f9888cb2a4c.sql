
-- Add popup control columns to polls table
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS max_displays integer NOT NULL DEFAULT 2;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS show_popup boolean NOT NULL DEFAULT true;

-- Table to track how many times a user has seen a poll popup
CREATE TABLE IF NOT EXISTS public.poll_popup_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  view_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_popup_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own popup views" ON public.poll_popup_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own popup views" ON public.poll_popup_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own popup views" ON public.poll_popup_views FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage popup views" ON public.poll_popup_views FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
