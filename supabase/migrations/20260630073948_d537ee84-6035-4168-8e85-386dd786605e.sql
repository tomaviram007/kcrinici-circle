CREATE OR REPLACE FUNCTION public.get_latest_event_banner()
RETURNS TABLE(event_id uuid, title text, event_date timestamptz, image_url text, album_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT e.id AS event_id, e.title, e.event_date, e.image_url,
           a.id AS album_id, a.cover_image_url AS album_cover,
           (e.event_date <= now()) AS is_past
    FROM public.events e
    LEFT JOIN public.gallery_albums a
      ON a.event_id = e.id AND a.is_approved = true
    WHERE e.is_admin_only = false
  )
  SELECT r.event_id, r.title, r.event_date,
         COALESCE(r.album_cover, r.image_url) AS image_url,
         r.album_id
  FROM ranked r
  WHERE COALESCE(r.album_cover, r.image_url) IS NOT NULL
  ORDER BY r.is_past DESC, r.event_date DESC
  LIMIT 1;
END $$;

GRANT EXECUTE ON FUNCTION public.get_latest_event_banner() TO anon, authenticated;