import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import DealCard from "./DealCard";

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_label: string | null;
  benefit_type?: string | null;
  benefit_value?: number | null;
  business_name: string;
  business_logo_url: string | null;
  card_image_url?: string | null;
  category: string;
  expires_at: string | null;
}

interface DealsCarouselProps {
  deals: Deal[];
  onDealClick: (deal: Deal) => void;
  expiresLabel?: string;
}

const DealsCarousel = ({ deals, onDealClick, expiresLabel }: DealsCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((index: number) => {
    const len = deals.length;
    if (len === 0) return;
    let next = index;
    if (next < 0) next = len - 1;
    if (next >= len) next = 0;
    setActiveIndex(next);
  }, [deals.length]);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  // Touch / drag handlers
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    setTranslateX(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const diff = clientX - startX;
    setTranslateX(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 60;
    if (translateX > threshold) {
      goNext(); // RTL: drag right -> next
    } else if (translateX < -threshold) {
      goPrev(); // RTL: drag left -> prev
    }
    setTranslateX(0);
  };

  if (deals.length === 0) return null;

  const getStyle = (index: number) => {
    const diff = index - activeIndex;
    const len = deals.length;
    let normalized = diff;
    if (diff > len / 2) normalized = diff - len;
    if (diff < -len / 2) normalized = diff + len;

    const isActive = normalized === 0;
    const isAdjacent = Math.abs(normalized) === 1;

    if (isActive) {
      return {
        transform: `translateX(calc(${normalized * 85}% + ${translateX}px)) scale(1) translateZ(0)`,
        zIndex: 30,
        opacity: 1,
      };
    }
    if (isAdjacent) {
      return {
        transform: `translateX(calc(${normalized * 85}% + ${translateX * 0.6}px)) scale(0.88) translateZ(-50px)`,
        zIndex: 20,
        opacity: 0.6,
      };
    }
    return {
      transform: `translateX(calc(${normalized * 85}% + ${translateX * 0.3}px)) scale(0.75) translateZ(-100px)`,
      zIndex: 10,
      opacity: 0,
    };
  };

  return (
    <div className="relative w-full py-8" dir="rtl">
      <div
        ref={containerRef}
        className="relative flex h-[420px] items-center justify-center perspective-[1200px] overflow-hidden touch-pan-y"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
      >
        {deals.map((deal, index) => (
          <div
            key={deal.id}
            className="absolute w-[min(340px,80vw)] transition-all duration-500 ease-out"
            style={{
              ...getStyle(index),
              transformStyle: "preserve-3d",
              pointerEvents: index === activeIndex ? "auto" : "none",
            }}
          >
            <DealCard
              deal={deal}
              expiresLabel={expiresLabel}
              onClick={() => onDealClick(deal)}
            />
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {deals.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-6 z-40 rounded-full bg-background/80 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/40"
            onClick={goNext}
            aria-label="הבא"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-6 z-40 rounded-full bg-background/80 backdrop-blur-sm border-border/50 hover:bg-primary/10 hover:border-primary/40"
            onClick={goPrev}
            aria-label="הקודם"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dots */}
      {deals.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {deals.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60"
              }`}
              aria-label={`מעבר לכרטיס ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DealsCarousel;
