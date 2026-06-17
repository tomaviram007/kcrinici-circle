ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS end_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS waze_url text;