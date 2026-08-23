REVOKE EXECUTE ON FUNCTION public.admin_analytics_overview(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_visitors(integer,integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_analytics_timeline(text,uuid,integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_analytics_overview(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_visitors(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_timeline(text,uuid,integer) TO authenticated;