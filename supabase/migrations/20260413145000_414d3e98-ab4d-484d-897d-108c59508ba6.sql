INSERT INTO storage.buckets (id, name, public) VALUES ('deals', 'deals', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Deal logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'deals');

CREATE POLICY "Authenticated users can upload deal logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'deals' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own deal logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'deals' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own deal logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'deals' AND auth.role() = 'authenticated');