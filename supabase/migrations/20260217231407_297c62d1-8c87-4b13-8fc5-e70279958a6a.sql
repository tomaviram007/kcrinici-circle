
-- Create storage bucket for announcement images
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to announcements bucket
CREATE POLICY "Authenticated users can upload announcement images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own announcement images"
ON storage.objects FOR DELETE
USING (bucket_id = 'announcements' AND auth.uid()::text = (storage.foldername(name))[1]);
