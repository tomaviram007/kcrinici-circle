

## Fix: Album Cover Upload RLS Error

### Problem
When changing an album cover image, the upload uses `upsert: true` to replace the existing file. The `gallery` storage bucket has an INSERT policy for approved members but **no UPDATE policy**, so replacing an existing file fails with "new row violates row-level security policy".

### Solution
Add an UPDATE policy on `storage.objects` for the `gallery` bucket, allowing users to update their own files (matching by folder name = user ID). This follows the same pattern already used for the `avatars` bucket.

### Technical Details

**Database Migration** - Add storage UPDATE policy:

```sql
CREATE POLICY "Users can update own gallery images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
```

This single migration fixes the issue. No code changes needed -- the existing upload logic in `Gallery.tsx` is correct.

