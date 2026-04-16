import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SmartAdBanner from "./SmartAdBanner";

interface AdCampaign {
  id: string;
  title: string;
  media_type: string;
  media_url: string;
  target_url: string;
  alt_text: string | null;
  priority: number;
  max_appearances: number;
}

interface SidebarAdStackProps {
  targetPage?: string;
  maxSlots?: number;
  className?: string;
}

const SidebarAdStack = ({ targetPage = "all", maxSlots = 3, className }: SidebarAdStackProps) => {
  const [ads, setAds] = useState<AdCampaign[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchAds = async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, title, media_type, media_url, target_url, alt_text, priority, max_appearances, target_page")
        .eq("placement", "sidebar")
        .eq("is_active", true)
        .lte("start_date", now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("priority", { ascending: false });

      if (cancelled || error) return;
      // Filter by target page (supports comma-separated pages)
      const filtered = (data || []).filter((ad: any) => {
        const pages = (ad.target_page || "all").split(",");
        return pages.includes("all") || pages.includes(targetPage);
      });
      setAds(filtered || []);
    };

    fetchAds();
    return () => { cancelled = true; };
  }, [targetPage]);

  // Show only up to maxSlots unique ads
  const displayAds = ads.slice(0, maxSlots);

  if (!displayAds.length) return null;

  return (
    <div className="flex flex-col gap-4">
      {displayAds.map((ad, index) => (
        <SmartAdBanner
          key={ad.id}
          placement="sidebar"
          targetPage={targetPage}
          slotIndex={index}
          manualAd={ad}
          className="!h-[220px]"
        />
      ))}
    </div>
  );
};

export default SidebarAdStack;
