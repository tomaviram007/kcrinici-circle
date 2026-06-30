import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LatestEventBannerProps {
  className?: string;
}

interface BannerData {
  event_id: string;
  title: string;
  image_url: string;
  album_id: string | null;
}

const LatestEventBanner = ({ className }: LatestEventBannerProps) => {
  const navigate = useNavigate();
  const [data, setData] = useState<BannerData | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase.rpc("get_latest_event_banner" as any);
      if (cancelled || error || !rows || (rows as any[]).length === 0) return;
      const row = (rows as any[])[0];
      if (!row?.image_url) return;
      setData({
        event_id: row.event_id,
        title: row.title,
        image_url: row.image_url,
        album_id: row.album_id ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const handleClick = () => {
    if (data.album_id) {
      navigate(`/gallery?album=${data.album_id}`);
    } else {
      navigate(`/gallery`);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick();
      }}
      aria-label={`${data.title} - גלריית האירוע האחרון`}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer group border-2 border-gold/60 bg-muted shadow-sm hover:shadow-lg transition-shadow duration-300",
        "w-full max-w-[1230px] mx-auto aspect-[16/9] sm:aspect-[3/1] lg:aspect-[1230/414]",
        className
      )}
    >
      <img
        src={data.image_url}
        alt={data.title}
        loading="eager"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03]",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
      <h3 className="absolute bottom-4 right-5 font-serif text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-lg pointer-events-none">
        {data.title}
      </h3>
      <span className="absolute top-3 right-3 text-[10px] font-medium text-white/90 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-md pointer-events-none">
        האירוע האחרון
      </span>
    </div>
  );
};

export default LatestEventBanner;
