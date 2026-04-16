import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SmartAdBannerProps {
  placement: string;
  targetPage?: string;
  slotIndex?: number;
  className?: string;
  rotateInterval?: number;
  fallbackPlacements?: string[];
}

interface AdCampaign {
  id: string;
  media_type: string;
  media_url: string;
  target_url: string;
  alt_text: string | null;
  priority: number;
  max_appearances: number;
}

/**
 * Convert a Supabase Storage public URL to an optimized render URL.
 * /storage/v1/object/public/bucket/path  →  /storage/v1/render/image/public/bucket/path?width=W&quality=Q
 * Non-Supabase URLs or videos are returned as-is.
 */
const optimizeImageUrl = (url: string, width = 800, quality = 75): string => {
  if (!url) return url;
  // Only transform Supabase storage URLs for images
  const match = url.match(/(https:\/\/[^/]+\/storage\/v1\/)object\/(public\/.+)/);
  if (!match) return url;
  return `${match[1]}render/image/${match[2]}?width=${width}&quality=${quality}`;
};

const SmartAdBanner = ({
  placement,
  targetPage = "all",
  slotIndex = 0,
  className,
  rotateInterval = 6000,
  fallbackPlacements = [],
}: SmartAdBannerProps) => {
  // Premium banner flag for hero/premium placements
  const isPremium = placement === "hero" || placement === "premium";
  const { user } = useAuth();
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [current, setCurrent] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const trackedRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackKey = useMemo(() => fallbackPlacements.filter(Boolean).join("|"), [fallbackPlacements]);

  // Choose optimal render width based on placement
  const renderWidth = useMemo(() => {
    const widths: Record<string, number> = {
      hero: 1230,
      premium: 1230,
      sidebar: 400,
      inline: 1230,
      between_content: 1230,
      inline_repeat: 1230,
    };
    return widths[placement] || 1230;
  }, [placement]);

  useEffect(() => {
    let cancelled = false;

    const fetchAds = async () => {
      const now = new Date().toISOString();
      const placementsToTry = [placement, ...fallbackKey.split("|").filter((item) => item && item !== placement)];

      for (const placementOption of placementsToTry) {
        const { data, error } = await supabase
          .from("ad_campaigns")
          .select("id, media_type, media_url, target_url, alt_text, priority, max_appearances")
          .eq("placement", placementOption)
          .eq("is_active", true)
          .lte("start_date", now)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .or(`target_page.eq.${targetPage},target_page.eq.all`)
          .order("priority", { ascending: false });

        if (cancelled || error) continue;

        const filtered = (data || []).filter((ad: AdCampaign) => slotIndex < (ad.max_appearances || 1));
        if (filtered.length > 0) {
          setAds((prev) => {
            const prevKey = prev.map((item) => item.id).join("|");
            const nextKey = filtered.map((item) => item.id).join("|");
            return prevKey === nextKey ? prev : filtered;
          });
          setCurrent(0);
          return;
        }
      }

      if (!cancelled) {
        setAds([]);
        setCurrent(0);
      }
    };

    fetchAds();

    return () => {
      cancelled = true;
    };
  }, [placement, targetPage, slotIndex, fallbackKey]);

  const trackImpression = useCallback(async (campaignId: string) => {
    if (trackedRef.current.has(campaignId)) return;
    trackedRef.current.add(campaignId);
    await supabase.rpc("track_ad_impression" as any, {
      p_campaign_id: campaignId,
      p_user_id: user?.id || null,
    });
  }, [user]);

  useEffect(() => {
    if (!ads.length || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && ads[current]) {
            trackImpression(ads[current].id);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [ads, current, trackImpression]);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setImageLoaded(false);
      setImageFailed(false);
      setCurrent((prev) => (prev + 1) % ads.length);
    }, rotateInterval);
    return () => clearInterval(timer);
  }, [ads.length, rotateInterval]);

  const handleClick = async (ad: AdCampaign) => {
    await supabase.rpc("track_ad_click" as any, {
      p_campaign_id: ad.id,
      p_user_id: user?.id || null,
    });
    const url = ad.target_url.startsWith("http") ? ad.target_url : `https://${ad.target_url}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!ads.length || imageFailed) return null;

  const ad = ads[current];
  const displayUrl = ad.media_type === "video" ? ad.media_url : optimizeImageUrl(ad.media_url, renderWidth);

  const sizeClasses: Record<string, string> = {
    hero: "w-full max-w-[1230px] mx-auto aspect-[16/9] sm:aspect-[3/1] lg:aspect-[1230/414]",
    premium: "w-full max-w-[1230px] mx-auto aspect-[16/9] sm:aspect-[3/1] lg:aspect-[1230/414]",
    sidebar: "w-full aspect-[4/3]",
    inline: "w-full max-w-[1230px] mx-auto aspect-[16/9] sm:aspect-[3/1] lg:aspect-[1230/414]",
    between_content: "w-full max-w-[1230px] mx-auto aspect-[16/9] sm:aspect-[3/1] lg:aspect-[1230/414]",
    inline_repeat: "w-full max-w-[1230px] mx-auto aspect-[2/1] sm:aspect-[3/1] lg:aspect-[1230/414]",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer group border border-border/20 bg-muted shadow-sm hover:shadow-md transition-shadow duration-300",
        sizeClasses[placement] || sizeClasses.inline,
        className
      )}
      onClick={() => handleClick(ad)}
      role="link"
      tabIndex={0}
      aria-label={ad.alt_text || "פרסומת"}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick(ad);
      }}
    >
      {ad.media_type === "video" ? (
        <video
          src={ad.media_url}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          muted
          autoPlay
          loop
          playsInline
        />
      ) : (
        <img
          src={displayUrl}
          alt={ad.alt_text || "פרסומת"}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03]",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.retried) {
              img.dataset.retried = "1";
              img.src = ad.media_url;
            } else {
              setImageLoaded(true);
            }
          }}
        />
      )}

      {/* Loading skeleton */}
      {!imageLoaded && ad.media_type !== "video" && (
        <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />

      {/* Sponsored label */}
      <span className="absolute bottom-3 left-3 text-[10px] font-medium text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md pointer-events-none">
        ממומן
      </span>

      {ads.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {ads.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrent(i);
              }}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                i === current ? "bg-white w-4" : "bg-white/50"
              )}
              aria-label={`עבור לפרסומת ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartAdBanner;
