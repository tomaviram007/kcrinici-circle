ALTER FUNCTION public.norm_phone(text) SET search_path = public;
ALTER FUNCTION public.norm_email(text) SET search_path = public;

REVOKE ALL ON FUNCTION public.resolve_community_member(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.event_feedback_attach_member() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.admin_event_engagement(uuid, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_community_members(text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_community_member_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_event_engagement(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_community_members(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_community_member_detail(uuid) TO authenticated;