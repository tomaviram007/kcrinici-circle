-- Add new roles: chief_editor and editor
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chief_editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';

-- Add is_approved to gallery_albums (for re-approval flow)
ALTER TABLE public.gallery_albums ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT true;

-- Update gallery_albums RLS: only show approved albums to regular users
DROP POLICY IF EXISTS "Authenticated users can view albums" ON public.gallery_albums;
CREATE POLICY "Authenticated users can view approved albums"
ON public.gallery_albums FOR SELECT
USING (
  (is_approved = true AND auth.uid() IS NOT NULL)
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow album creators to update their own albums
DROP POLICY IF EXISTS "Users can update own albums" ON public.gallery_albums;
CREATE POLICY "Users can update own albums"
ON public.gallery_albums FOR UPDATE
USING (created_by = auth.uid());

-- Allow admins to manage user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));