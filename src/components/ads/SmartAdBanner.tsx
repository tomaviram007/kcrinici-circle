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
  manualAd?: AdCampaign | null;
}

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

/**
 * Route a Supabase Storage public URL through our neutral-named edge proxy ("/functions/v1/m")
 * so ad-blockers don't block requests containing "/ads/" in the path.
 * Also supports Supabase's image render transform (width/quality) via query params.
 * Non-Supabase URLs are returned as-is.
 */
const optimizeImageUrl = (url: string, width = 800, quality = 75): string => {
  if (!url) return url;
  // Match: https://<host>/storage/v1/object/public/<bucket>/<path>
  const match = url.match(/^(https:\/\/[^/]+)\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return url;
  const [, origin, bucket, path] = match;
  // Use functions host: replace the supabase project host with the functions endpoint path.
  // Our edge function is reachable at `${origin}/functions/v1/m`.
  const params = new URLSearchParams({ b: bucket, p: path, w: String(width), q: String(quality) });
  return `${origin}/functions/v1/m?${params.toString()}`;
};

const passthroughMediaUrl = (url: string): string => {
  if (!url) return url;
  const match = url.match(/^(https:\/\/[^/]+)\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return url;
  const [, origin, bucket, path] = match;
  const params = new URLSearchParams({ b: bucket, p: path });
  return `${origin}/functions/v1/m?${params.toString()}`;
};

const SmartAdBanner = ({
  placement,
  targetPage = "all",
  slotIndex = 0,
  className,
  rotateInterval = 6000,
  fallbackPlacements = [],
  manualAd = null,
}: SmartAdBannerProps) => {
  // Premium banner flag for hero/premium placements
  const isPremium = placement === "hero" || placement === "premium";
  const { user } = useAuth();
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [current, setCurrent] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
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
    // If a manual ad is provided, use it directly - skip fetching
    if (manualAd) {
      setAds([manualAd]);
      setCurrent(0);
      return;
    }

    let cancelled = false;

    const fetchAds = async () => {
      const now = new Date().toISOString();
      const placementsToTry = [placement, ...fallbackKey.split("|").filter((item) => item && item !== placement)];

      const { data: allActive, error: rpcError } = await supabase.rpc("get_active_ad_campaigns" as any);
      if (cancelled || rpcError) return;

      for (const placementOption of placementsToTry) {
        const data = ((allActive as any[]) || [])
          .filter((c) => c.placement === placementOption)
          .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

        if (cancelled) continue;

        // Filter ads that target this page (supports comma-separated pages)
        const pageFiltered = (data || []).filter((ad: any) => {
          const pages = (ad.target_page || "all").split(",");
          return pages.includes("all") || pages.includes(targetPage);
        });

        if (cancelled) continue;

        const filtered = pageFiltered.filter((ad: AdCampaign) => slotIndex < (ad.max_appearances || 1));
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
  }, [placement, targetPage, slotIndex, fallbackKey, manualAd]);

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

  if (!ads.length) return null;

  const ad = ads[current];
  const videoSrc = ad.media_type === "video" ? passthroughMediaUrl(ad.media_url) : ad.media_url;
  const displayUrl = ad.media_type === "video" ? videoSrc : optimizeImageUrl(ad.media_url, renderWidth);

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
        "relative overflow-hidden rounded-2xl cursor-pointer group border-2 border-gold/60 bg-muted shadow-sm hover:shadow-lg transition-shadow duration-300",
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

      {/* Bottom gradient overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

      {/* Ad title at bottom right */}
      {ad.title && (
        <h3 className="absolute bottom-4 right-5 font-serif text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-lg pointer-events-none">
          {ad.title}
        </h3>
      )}

      {/* Sponsored label */}
      <span className="absolute top-3 left-3 text-[10px] font-medium text-white/70 bg-black/30 backdrop-blur-sm px-2 py-1 rounded-md pointer-events-none">
        ממומן
      </span>

      {ads.length > 1 && (
        <div className="absolute bottom-2 left-5 flex gap-1">
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
