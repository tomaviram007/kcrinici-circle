
-- Drop overly permissive storage policies that bypass folder restrictions
DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
