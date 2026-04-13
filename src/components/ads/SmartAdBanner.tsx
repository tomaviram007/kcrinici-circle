import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SmartAdBannerProps {
  placement: string;
  targetPage?: string;
  slotIndex?: number;
  className?: string;
  rotateInterval?: number;
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

const SmartAdBanner = ({ placement, targetPage = "all", slotIndex = 0, className, rotateInterval = 6000 }: SmartAdBannerProps) => {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [current, setCurrent] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const trackedRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAds = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("ad_campaigns")
        .select("id, media_type, media_url, target_url, alt_text, priority, max_appearances")
        .eq("placement", placement)
        .eq("is_active", true)
        .lte("start_date", now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .or(`target_page.eq.${targetPage},target_page.eq.all`)
        .order("priority", { ascending: false });

      // Filter ads: only show if slotIndex < max_appearances
      const filtered = (data || []).filter((ad: any) => slotIndex < (ad.max_appearances || 1));
      setAds(filtered);
    };
    fetchAds();
  }, [placement, targetPage, slotIndex]);

  useEffect(() => {
    setImageLoaded(false);
  }, [current]);

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
        entries.forEach(entry => {
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
      setCurrent(prev => (prev + 1) % ads.length);
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

  const sizeClasses: Record<string, string> = {
    hero: "w-full h-[200px] sm:h-[280px] md:h-[350px]",
    premium: "w-full h-[180px] sm:h-[250px] md:h-[300px]",
    sidebar: "w-full h-[250px]",
    inline: "w-full h-[120px] sm:h-[180px]",
    between_content: "w-full h-[120px] sm:h-[180px]",
    inline_repeat: "w-full h-[100px] sm:h-[140px]",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl cursor-pointer group border border-border/30",
        sizeClasses[placement] || sizeClasses.inline,
        className
      )}
      onClick={() => handleClick(ad)}
      role="link"
      tabIndex={0}
      aria-label={ad.alt_text || "פרסומת"}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(ad); }}
    >
      {!imageLoaded && ad.media_type !== "video" && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse flex items-center justify-center z-10">
          <span className="text-xs text-muted-foreground">טוען פרסומת...</span>
        </div>
      )}

      {ad.media_type === "video" ? (
        <video
          src={ad.media_url}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          muted
          autoPlay
          loop
          playsInline
        />
      ) : (
        <img
          src={ad.media_url}
          alt={ad.alt_text || ""}
          className={cn(
            "w-full h-full object-cover transition-all duration-500 group-hover:scale-105",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.dataset.retried) {
              img.dataset.retried = "1";
              setTimeout(() => {
                img.src = ad.media_url + (ad.media_url.includes("?") ? "&" : "?") + "t=" + Date.now();
              }, 500);
            } else {
              setImageLoaded(true);
            }
          }}
        />
      )}

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 pointer-events-none" />

      <span className="absolute bottom-2 left-2 text-[9px] font-medium text-white/60 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded pointer-events-none">
        ממומן
      </span>

      {ads.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-all",
                i === current ? "bg-white w-4" : "bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SmartAdBanner;
