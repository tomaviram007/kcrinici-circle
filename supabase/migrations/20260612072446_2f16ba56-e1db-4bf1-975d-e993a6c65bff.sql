
-- ─── 1. Block self-approval on profiles + protect admin removal ───
CREATE OR REPLACE FUNCTION public.block_profile_approval_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins may flip is_approved
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change is_approved';
  END IF;

  -- Only admins may flip is_removed
  IF NEW.is_removed IS DISTINCT FROM OLD.is_removed
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change is_removed';
  END IF;

  -- Never allow removing an admin account
  IF NEW.is_removed = true AND public.has_role(OLD.user_id, 'admin') THEN
    RAISE EXCEPTION 'Cannot remove an admin account';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_approval ON public.profiles;
CREATE TRIGGER enforce_profile_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.block_profile_approval_self_edit();

-- ─── 2. Block self-approval on announcements ───
CREATE OR REPLACE FUNCTION public.block_announcement_approval_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change is_approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_announcement_approval ON public.announcements;
CREATE TRIGGER enforce_announcement_approval
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.block_announcement_approval_self_edit();

-- ─── 3. Tighten audit_log INSERT ───
DROP POLICY IF EXISTS "Authenticated team members can insert audit log" ON public.audit_log;
CREATE POLICY "Users can insert their own audit log entries"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── 4. Restrict professional_recommendations SELECT to approved members ───
DROP POLICY IF EXISTS "Authenticated users can view approved recommendations" ON public.professional_recommendations;
CREATE POLICY "Approved members can view approved recommendations"
  ON public.professional_recommendations FOR SELECT TO authenticated
  USING (is_approved = true AND is_hidden = false AND public.is_approved_user(auth.uid()));

-- ─── 5. Restrict ad_campaigns public read to authenticated users ───
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.ad_campaigns;
CREATE POLICY "Authenticated users can view active campaigns"
  ON public.ad_campaigns FOR SELECT TO authenticated
  USING (is_active = true AND now() >= start_date AND (end_date IS NULL OR now() <= end_date));

-- ─── 6. Tighten storage events bucket upload to approved members ───
DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Approved members can upload event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'events' AND public.is_approved_user(auth.uid()));
