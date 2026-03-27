import { useEffect, useRef } from "react";
import gsap from "gsap";

interface DealBadgeProps {
  benefitType?: string | null;
  benefitValue?: number | null;
  discountLabel?: string | null;
  className?: string;
}

/**
 * Renders the yellow circular badge for a deal.
 * Supports benefit_type/value (new) and falls back to discount_label (legacy).
 */
const DealBadge = ({ benefitType, benefitValue, discountLabel, className = "" }: DealBadgeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Determine what to show
  const hasStructured = benefitType && benefitValue != null;
  const isPercent = benefitType === "percent";
  const isConsultation = benefitType === "consultation";

  // Fallback to legacy discount_label
  if (!hasStructured && !discountLabel) return null;

  const renderContent = () => {
    if (hasStructured) {
      if (isPercent) {
        return (
          <div className="flex flex-col items-center justify-center leading-none text-center" dir="rtl">
            <span className="font-serif text-sm font-bold text-primary-foreground">
              %{benefitValue}
            </span>
            <span className="font-body text-[9px] font-semibold text-primary-foreground/90 mt-0.5">
              הנחה
            </span>
          </div>
        );
      }
      if (isConsultation) {
        return (
          <div className="flex flex-col items-center justify-center leading-none text-center" dir="rtl">
            <span className="font-body text-[10px] font-bold text-primary-foreground leading-tight">
              שעת
            </span>
            <span className="font-body text-[10px] font-bold text-primary-foreground leading-tight">
              ייעוץ
            </span>
          </div>
        );
      }
    }

    // Legacy fallback
    return (
      <span className="font-serif text-xs font-bold text-primary-foreground leading-tight text-center">
        {discountLabel}
      </span>
    );
  };

  // GSAP pop-in animation
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { scale: 0, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)", delay: 0.2 }
    );
  }, []);

  return (
    <div
      ref={ref}
      className={`absolute -top-3 -left-3 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg 
        group-hover:animate-[pulse_1s_ease-in-out_1] ${className}`}
    >
      {renderContent()}
    </div>
  );
};

export default DealBadge;
