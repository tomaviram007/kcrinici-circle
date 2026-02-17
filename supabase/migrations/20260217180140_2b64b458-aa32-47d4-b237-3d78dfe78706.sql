
-- =============================================
-- Add is_approved to announcements and jobs
-- =============================================
ALTER TABLE public.announcements ADD COLUMN is_approved boolean NOT NULL DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- =============================================
-- ANNOUNCEMENTS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Approved members can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can update own announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can delete own announcements" ON public.announcements;

CREATE POLICY "Anyone can read approved announcements" ON public.announcements FOR SELECT USING (is_approved = true);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can submit announcements" ON public.announcements FOR INSERT WITH CHECK (true);

-- =============================================
-- JOBS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can read active jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Approved members can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;

CREATE POLICY "Anyone can read approved jobs" ON public.jobs FOR SELECT USING (is_approved = true AND is_active = true);
CREATE POLICY "Admins can manage jobs" ON public.jobs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can submit jobs" ON public.jobs FOR INSERT WITH CHECK (true);

-- =============================================
-- EVENTS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can read events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;

CREATE POLICY "Anyone can read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PROFILES: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Approved members can see approved profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Anyone can see approved profiles" ON public.profiles FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can see all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- GALLERY_ALBUMS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can view albums" ON public.gallery_albums;
DROP POLICY IF EXISTS "Approved members can create albums" ON public.gallery_albums;
DROP POLICY IF EXISTS "Users can update own albums" ON public.gallery_albums;
DROP POLICY IF EXISTS "Users can delete own albums" ON public.gallery_albums;
DROP POLICY IF EXISTS "Admins can manage all albums" ON public.gallery_albums;

CREATE POLICY "Anyone can view albums" ON public.gallery_albums FOR SELECT USING (true);
CREATE POLICY "Admins can manage albums" ON public.gallery_albums FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create albums" ON public.gallery_albums FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own albums" ON public.gallery_albums FOR DELETE USING (created_by = auth.uid());

-- =============================================
-- GALLERY_PHOTOS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can view photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Approved members can upload photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Admins can manage all photos" ON public.gallery_photos;

CREATE POLICY "Anyone can view photos" ON public.gallery_photos FOR SELECT USING (true);
CREATE POLICY "Admins can manage photos" ON public.gallery_photos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can upload photos" ON public.gallery_photos FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own photos" ON public.gallery_photos FOR DELETE USING (uploaded_by = auth.uid());

-- =============================================
-- POLLS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can view polls" ON public.polls;
DROP POLICY IF EXISTS "Approved members can create polls" ON public.polls;
DROP POLICY IF EXISTS "Users can update own polls" ON public.polls;
DROP POLICY IF EXISTS "Users can delete own polls" ON public.polls;
DROP POLICY IF EXISTS "Admins can manage all polls" ON public.polls;

CREATE POLICY "Anyone can view active polls" ON public.polls FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage polls" ON public.polls FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create polls" ON public.polls FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own polls" ON public.polls FOR DELETE USING (created_by = auth.uid());

-- =============================================
-- POLL_OPTIONS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can view poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Approved members can create poll options" ON public.poll_options;
DROP POLICY IF EXISTS "Admins can manage poll options" ON public.poll_options;

CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Admins can manage poll options" ON public.poll_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create poll options" ON public.poll_options FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- POLL_VOTES: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved members can view votes" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can vote" ON public.poll_votes;
DROP POLICY IF EXISTS "Users can remove own vote" ON public.poll_votes;
DROP POLICY IF EXISTS "Admins can manage votes" ON public.poll_votes;

CREATE POLICY "Anyone can view votes" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage votes" ON public.poll_votes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- EVENT_RSVPS: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Approved users can view RSVPs" ON public.event_rsvps;
DROP POLICY IF EXISTS "Users can RSVP" ON public.event_rsvps;
DROP POLICY IF EXISTS "Users can update own RSVP" ON public.event_rsvps;
DROP POLICY IF EXISTS "Users can delete own RSVP" ON public.event_rsvps;
DROP POLICY IF EXISTS "Admins can manage all RSVPs" ON public.event_rsvps;

CREATE POLICY "Anyone can view RSVPs" ON public.event_rsvps FOR SELECT USING (true);
CREATE POLICY "Authenticated users can RSVP" ON public.event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own RSVP" ON public.event_rsvps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own RSVP" ON public.event_rsvps FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage RSVPs" ON public.event_rsvps FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- USER_ROLES: Drop restrictive, add permissive
-- =============================================
DROP POLICY IF EXISTS "Users can see own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can see roles" ON public.user_roles;

CREATE POLICY "Users can see own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can see roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
