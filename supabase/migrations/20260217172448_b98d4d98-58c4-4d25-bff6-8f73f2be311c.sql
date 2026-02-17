
-- ========== GALLERY ==========
CREATE TABLE public.gallery_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can view albums" ON public.gallery_albums FOR SELECT USING (is_approved_user(auth.uid()));
CREATE POLICY "Approved members can create albums" ON public.gallery_albums FOR INSERT WITH CHECK (is_approved_user(auth.uid()));
CREATE POLICY "Users can update own albums" ON public.gallery_albums FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own albums" ON public.gallery_albums FOR DELETE USING (created_by = auth.uid());
CREATE POLICY "Admins can manage all albums" ON public.gallery_albums FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.gallery_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.gallery_albums(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can view photos" ON public.gallery_photos FOR SELECT USING (is_approved_user(auth.uid()));
CREATE POLICY "Approved members can upload photos" ON public.gallery_photos FOR INSERT WITH CHECK (is_approved_user(auth.uid()));
CREATE POLICY "Users can delete own photos" ON public.gallery_photos FOR DELETE USING (uploaded_by = auth.uid());
CREATE POLICY "Admins can manage all photos" ON public.gallery_photos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Gallery storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', true);

CREATE POLICY "Approved members can upload gallery images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND is_approved_user(auth.uid()));
CREATE POLICY "Anyone can view gallery images" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "Users can delete own gallery images" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers
CREATE TRIGGER update_gallery_albums_updated_at BEFORE UPDATE ON public.gallery_albums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== POLLS ==========
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can view polls" ON public.polls FOR SELECT USING (is_approved_user(auth.uid()));
CREATE POLICY "Approved members can create polls" ON public.polls FOR INSERT WITH CHECK (is_approved_user(auth.uid()));
CREATE POLICY "Users can update own polls" ON public.polls FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own polls" ON public.polls FOR DELETE USING (created_by = auth.uid());
CREATE POLICY "Admins can manage all polls" ON public.polls FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.poll_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can view poll options" ON public.poll_options FOR SELECT USING (is_approved_user(auth.uid()));
CREATE POLICY "Approved members can create poll options" ON public.poll_options FOR INSERT WITH CHECK (is_approved_user(auth.uid()));
CREATE POLICY "Admins can manage poll options" ON public.poll_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members can view votes" ON public.poll_votes FOR SELECT USING (is_approved_user(auth.uid()));
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved_user(auth.uid()));
CREATE POLICY "Users can remove own vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage votes" ON public.poll_votes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Triggers
CREATE TRIGGER update_polls_updated_at BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
