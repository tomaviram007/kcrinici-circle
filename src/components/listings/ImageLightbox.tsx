import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  startIndex?: number;
  title: string;
  caption?: string;
  onClose: () => void;
}

/**
 * Full screen photo viewer for a listing. Arrows follow the same direction as
 * the ones on the card, and it also answers the keyboard and a finger swipe.
 */
const ImageLightbox = ({ images, startIndex = 0, title, caption, onClose }: Props) => {
  const [idx, setIdx] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const go = (delta: number) => {
    if (images.length < 2) return;
    setIdx((i) => (i + delta + images.length) % images.length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    // Stop the page behind from scrolling while the viewer is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  if (!images.length) return null;

  const current = Math.min(idx, images.length - 1);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-sm"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={`תמונות של ${title}`}
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) > 40) go(delta < 0 ? -1 : 1);
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-lg font-bold text-foreground">{title}</h2>
          {caption && <p className="truncate font-body text-xs text-muted-foreground">{caption}</p>}
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="סגירה"
          className="shrink-0 rounded-full border border-border bg-background/80 p-2 text-foreground transition-colors hover:bg-secondary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-2">
        <img
          src={images[current]}
          alt={`${title} ${current + 1}`}
          className="max-h-full max-w-full rounded-lg object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="התמונה הבאה"
              className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2.5 text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="התמונה הקודמת"
              className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background/80 p-2.5 text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="shrink-0 space-y-2 px-4 pb-5" onClick={(e) => e.stopPropagation()}>
          <p className="text-center font-body text-xs text-muted-foreground">
            {current + 1} מתוך {images.length}
          </p>
          <div className="flex justify-center gap-2 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`תמונה ${i + 1}`}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                  i === current ? "border-gold" : "border-border/60 hover:border-gold/50"
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ImageLightbox;
