
-- Create quotes table for the quote section
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  author TEXT NOT NULL,
  author_title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active quotes" ON public.quotes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage quotes" ON public.quotes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial quotes
INSERT INTO public.quotes (text, author, author_title) VALUES
  ('פשטות היא תנאי לאמינות.', 'Edsger W. Dijkstra', 'מדען מחשב'),
  ('עיצוב הוא לא איך שזה נראה, אלא איך שזה עובד.', 'Steve Jobs', 'יזם'),
  ('שלמות היא לא כשאין מה להוסיף, אלא כשאין מה להוריד.', 'Antoine de Saint-Exupéry', 'סופר');

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
