import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SmartAdBannerProps {
  placement: "hero" | "sidebar" | "inline";
  className?: string;
  rotateInterval?: number; // ms, default 6000
}

interface AdCampaign {
  id: string;
  media_type: string;
  media_url: string;
  target_url: string;
  alt_text: string | null;
  priority: number;
}

const SmartAdBanner = ({ placement, className, rotateInterval = 6000 }: SmartAdBannerProps) => {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [current, setCurrent] = useState(0);
  const trackedRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch active ads for this placement
  useEffect(() => {
    const fetchAds = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("ad_campaigns")
        .select("id, media_type, media_url, target_url, alt_text, priority")
        .eq("placement", placement)
        .eq("is_active", true)
        .lte("start_date", now)
        .gte("end_date", now)
        .order("priority", { ascending: false });
      setAds(data || []);
    };
    fetchAds();
  }, [placement]);

  // Track impression when ad becomes visible
  const trackImpression = useCallback(async (campaignId: string) => {
    if (trackedRef.current.has(campaignId)) return;
    trackedRef.current.add(campaignId);
    await supabase.rpc("track_ad_impression", {
      p_campaign_id: campaignId,
      p_user_id: user?.id || null,
    });
  }, [user]);

  // IntersectionObserver for impression tracking
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

  // Auto-rotate
  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % ads.length);
    }, rotateInterval);
    return () => clearInterval(timer);
  }, [ads.length, rotateInterval]);

  // Track click
  const handleClick = async (ad: AdCampaign) => {
    await supabase.rpc("track_ad_click", {
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
    sidebar: "w-full h-[250px]",
    inline: "w-full h-[120px] sm:h-[180px]",
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-xl cursor-pointer group",
        sizeClasses[placement],
        className
      )}
      onClick={() => handleClick(ad)}
      role="link"
      tabIndex={0}
      aria-label={ad.alt_text || "פרסומת"}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(ad); }}
    >
      {ad.media_type === "video" ? (
        <video
          src={ad.media_url}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          muted
          autoPlay
          loop
          playsInline
          loading="lazy"
        />
      ) : (
        <img
          src={ad.media_url}
          alt={ad.alt_text || ""}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Subtle overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

      {/* Ad indicator */}
      <span className="absolute bottom-2 left-2 text-[9px] font-medium text-white/60 bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded">
        ממומן
      </span>

      {/* Rotation dots */}
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
