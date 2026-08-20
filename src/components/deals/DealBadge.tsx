import { useEffect, useRef } from "react";
import gsap from "gsap";

interface DealBadgeProps {
  benefitType?: string | null;
  benefitValue?: number | null;
  discountLabel?: string | null;
  className?: string;
  variant?: "circle" | "ribbon";
}

/**
 * Renders the discount badge for a deal.
 * Supports two variants:
 * - "circle" (legacy): yellow circular badge for compact cards
 * - "ribbon" (default): horizontal ribbon overlay on card images
 */
const DealBadge = ({ benefitType, benefitValue, discountLabel, className = "", variant = "ribbon" }: DealBadgeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const hasStructured = benefitType && benefitValue != null;
  const isPercent = benefitType === "percent";
  const isConsultation = benefitType === "consultation";

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)", delay: 0.15 }
    );
  }, []);

  if (!hasStructured && !discountLabel) return null;

  const label = hasStructured
    ? isPercent
      ? `${benefitValue}% הנחה`
      : isConsultation
      ? "שעת ייעוץ"
      : discountLabel
    : discountLabel;

  if (variant === "ribbon") {
    return (
      <div
        ref={ref}
        className={`absolute top-3 right-3 z-10 rounded-full bg-primary/95 px-3 py-1.5 shadow-lg backdrop-blur-sm ${className}`}
        dir="rtl"
      >
        <span className="font-body text-xs font-bold text-primary-foreground whitespace-nowrap">
          {label}
        </span>
      </div>
    );
  }

  // Legacy circle variant
  return (
    <div
      ref={ref}
      className={`absolute -top-3 -left-3 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg group-hover:animate-[pulse_1s_ease-in-out_1] ${className}`}
    >
      <span className="font-serif text-xs font-bold text-primary-foreground leading-tight text-center">
        {label}
      </span>
    </div>
  );
};

export default DealBadge;
