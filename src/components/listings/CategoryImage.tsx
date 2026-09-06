import { useState } from "react";
import { findCategory } from "@/lib/secondhand-categories";
import { useCategoryImages } from "@/hooks/useCategoryImages";

interface Props {
  category?: string | null;
  /** The item's own photo, if it has one */
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  /** Small thumbnails: icon only, no label */
  compact?: boolean;
}

/**
 * The picture for a second hand item. Order of preference:
 * the item's own photo, then the picture the admin set for its category,
 * then a drawn tile in the club's look. A photo that fails to load (dead
 * link, removed from an external host) drops to the next option instead of
 * showing a broken image.
 */
const CategoryImage = ({ category, src, alt, className = "", loading, compact = false }: Props) => {
  const cat = findCategory(category);
  const categoryImages = useCategoryImages();
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const [brokenCategoryUrl, setBrokenCategoryUrl] = useState<string | null>(null);

  const own = src && brokenSrc !== src ? src : null;
  const categoryUrl = categoryImages[cat.slug];
  const fromCategory = categoryUrl && brokenCategoryUrl !== categoryUrl ? categoryUrl : null;

  if (own) {
    return <img src={own} alt={alt} loading={loading} className={className} onError={() => setBrokenSrc(own)} />;
  }
  if (fromCategory) {
    return (
      <img
        src={fromCategory}
        alt={alt}
        loading={loading}
        className={className}
        onError={() => setBrokenCategoryUrl(fromCategory)}
      />
    );
  }

  const Icon = cat.icon;
  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(circle at 50% 38%, hsl(${cat.hue} 26% 20%) 0%, hsl(${cat.hue} 18% 11%) 55%, hsl(20 15% 6%) 100%)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(43 72% 52%) 1px, transparent 1px), linear-gradient(90deg, hsl(43 72% 52%) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,hsl(43_72%_52%/0.16),transparent_58%)]" />
      <div className="relative flex flex-col items-center gap-2">
        <div
          className={`rounded-full border border-gold/40 bg-background/40 shadow-[0_0_40px_hsl(43_72%_52%/0.25)] ${
            compact ? "p-2" : "p-5"
          }`}
        >
          <Icon className={compact ? "h-5 w-5 text-gold" : "h-10 w-10 text-gold"} strokeWidth={1.4} />
        </div>
        {!compact && <span className="font-serif text-sm tracking-wide text-gold/80">{cat.name}</span>}
      </div>
    </div>
  );
};

export default CategoryImage;
