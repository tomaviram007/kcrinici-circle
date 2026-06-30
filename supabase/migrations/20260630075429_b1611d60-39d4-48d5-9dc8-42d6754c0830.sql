
CREATE TABLE public.promo_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  emoji text,
  button_text text,
  button_url text,
  days_of_week int[] DEFAULT NULL, -- 0=Sun..6=Sat, NULL = every day
  start_date timestamptz,
  end_date timestamptz,
  target_page text NOT NULL DEFAULT 'announcements',
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promo_banners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_banners TO authenticated;
GRANT ALL ON public.promo_banners TO service_role;

ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
ON public.promo_banners FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage banners"
ON public.promo_banners FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER promo_banners_updated_at
BEFORE UPDATE ON public.promo_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the existing Tuesday banner so nothing visually disappears
INSERT INTO public.promo_banners (title, body, emoji, button_text, button_url, days_of_week, target_page, display_order)
VALUES (
  'היום יום שלישי – יום פרסומים!',
  'היום יום הפרסום הרשמי בקבוצת הוואטסאפ של הגברים של ק.קרניצי. שתפו מודעות והזדמנויות!',
  '📢',
  'לקבוצה',
  'https://chat.whatsapp.com/',
  ARRAY[2],
  'announcements',
  0
);
