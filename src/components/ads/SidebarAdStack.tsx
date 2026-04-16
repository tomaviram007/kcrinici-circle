import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  /** Which sidebar side: "right" | "left" | undefined (legacy = both) */
  side?: "right" | "left";
}

const SidebarAdStack = ({ targetPage = "all", maxSlots = 3, className, side }: SidebarAdStackProps) => {
  const [ads, setAds] = useState<AdCampaign[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchAds = async () => {
      const now = new Date().toISOString();

      // Determine which placements to query based on side
      const placements = side
        ? [`sidebar_${side}`, "sidebar"] // specific side + fallback to generic sidebar
        : ["sidebar"];

      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("id, title, media_type, media_url, target_url, alt_text, priority, max_appearances, target_page, placement")
        .in("placement", placements)
        .eq("is_active", true)
        .lte("start_date", now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("priority", { ascending: false });

      if (cancelled || error) return;

      // Filter by target page
      const filtered = (data || []).filter((ad: any) => {
        const pages = (ad.target_page || "all").split(",");
        return pages.includes("all") || pages.includes(targetPage);
      });

      // If querying a specific side, prioritize side-specific ads, then fill with generic
      if (side) {
        const sideSpecific = filtered.filter((ad: any) => ad.placement === `sidebar_${side}`);
        const generic = filtered.filter((ad: any) => ad.placement === "sidebar");
        // Combine: side-specific first, then generic (no duplicates)
        const seenIds = new Set(sideSpecific.map(a => a.id));
        const combined = [...sideSpecific, ...generic.filter(a => !seenIds.has(a.id))];
        setAds(combined);
      } else {
        setAds(filtered);
      }
    };

    fetchAds();
    return () => { cancelled = true; };
  }, [targetPage, side]);

  const displayAds = ads.slice(0, maxSlots);

  if (!displayAds.length) return null;

  return (
    <div className={`flex flex-col gap-4 ${className || ""}`}>
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
