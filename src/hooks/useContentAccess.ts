import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ContentType = "jobs" | "members" | "professionals" | "deals" | "secondhand" | "events";

interface Setting {
  content_type: ContentType;
  public_list_enabled: boolean;
  public_card_open_enabled: boolean;
  public_contact_enabled: boolean;
  public_action_enabled: boolean;
  public_images_enabled: boolean;
  public_price_enabled: boolean;
}

const DEFAULT: Omit<Setting, "content_type"> = {
  public_list_enabled: true,
  public_card_open_enabled: false,
  public_contact_enabled: false,
  public_action_enabled: false,
  public_images_enabled: true,
  public_price_enabled: true,
};

export const useContentAccess = (type: ContentType) => {
  const { user, isApproved } = useAuth();
  const isMember = !!user && isApproved;

  const { data } = useQuery({
    queryKey: ["content_access_settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("content_access_settings")
        .select("*");
      if (error) throw error;
      return data as Setting[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const s = data?.find((row) => row.content_type === type);
  const cfg = { ...DEFAULT, ...(s || {}) };

  return {
    isMember,
    canSeeList: isMember || cfg.public_list_enabled,
    canOpenCard: isMember || cfg.public_card_open_enabled,
    canSeeContact: isMember || cfg.public_contact_enabled,
    canAct: isMember || cfg.public_action_enabled,
    canSeeImages: isMember || cfg.public_images_enabled,
    canSeePrice: isMember || cfg.public_price_enabled,
  };
};
