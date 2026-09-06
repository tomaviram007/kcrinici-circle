import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_IMAGE_PREFIX } from "@/lib/secondhand-categories";

const EMPTY: Record<string, string> = {};

/**
 * Pictures the admin uploaded per second hand category, keyed by slug.
 * Used when an item has no photo of its own. Empty until loaded.
 */
export const useCategoryImages = (): Record<string, string> => {
  const { data } = useQuery({
    queryKey: ["category-images", "secondhand"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .like("key", `${CATEGORY_IMAGE_PREFIX}%`);
      const map: Record<string, string> = {};
      data?.forEach((row) => {
        map[row.key.replace(CATEGORY_IMAGE_PREFIX, "")] = row.value;
      });
      return map;
    },
    staleTime: 1000 * 60 * 10,
  });
  return data ?? EMPTY;
};
