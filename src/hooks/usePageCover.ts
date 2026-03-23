import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches a dynamic cover image for a page from site_settings.
 * Falls back to the provided static import if no DB override exists.
 */
export const usePageCover = (pageKey: string, fallbackImage: string): string => {
  const { data } = useQuery({
    queryKey: ["page-cover", pageKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", `cover_image_${pageKey}`)
        .maybeSingle();
      return data?.value || null;
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
  });

  return data || fallbackImage;
};
