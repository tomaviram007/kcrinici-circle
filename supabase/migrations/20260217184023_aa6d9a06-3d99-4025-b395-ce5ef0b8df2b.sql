
-- Create events storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

-- Allow public read access
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

-- Allow authenticated users to upload event images
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'events' AND auth.uid() IS NOT NULL);

-- Allow admins to delete event images
CREATE POLICY "Admins can delete event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'events' AND has_role(auth.uid(), 'admin'::app_role));
