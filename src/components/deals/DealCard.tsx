import { Clock, Store } from "lucide-react";
import { trackAction } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import DealBadge from "./DealBadge";

interface DealCardProps {
  deal: {
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
  };
  expiresLabel?: string;
  onClick?: () => void;
  className?: string;
}

const categoryGradients: Record<string, string> = {
  אוכל: "from-orange-500/30 to-rose-500/30",
  פנאי: "from-blue-500/30 to-cyan-500/30",
  רכב: "from-slate-500/30 to-zinc-500/30",
  לבית: "from-emerald-500/30 to-teal-500/30",
  אופנה: "from-purple-500/30 to-pink-500/30",
  טכנולוגיה: "from-indigo-500/30 to-violet-500/30",
  בריאות: "from-green-500/30 to-lime-500/30",
  כללי: "from-primary/30 to-gold/30",
};

const DealCard = ({ deal, expiresLabel = "תוקף עד", onClick, className = "" }: DealCardProps) => {
  const gradient = categoryGradients[deal.category] || categoryGradients["כללי"];
  const imageUrl = deal.card_image_url || deal.business_logo_url;
  const hasImage = Boolean(imageUrl);

  return (
    <div
      onClick={() => { trackAction("deal_card_open", { id: deal.id, business: deal.business_name }); onClick?.(); }}
      className={`group relative flex flex-col rounded-3xl border border-border/40 bg-card/80 backdrop-blur-md overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_0_40px_hsl(var(--primary)/0.15)] hover:-translate-y-1 ${className}`}
      dir="rtl"
    >
      {/* Image section */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {hasImage ? (
          <img
            src={imageUrl!}
            alt={deal.business_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <Store className="h-12 w-12 text-primary-foreground/40" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />

        {/* Category badge */}
        <div className="absolute bottom-3 right-3">
          <Badge variant="secondary" className="text-[10px] font-body bg-background/80 backdrop-blur-sm">
            {deal.category}
          </Badge>
        </div>

        {/* Discount ribbon */}
        <DealBadge
          benefitType={deal.benefit_type}
          benefitValue={deal.benefit_value}
          discountLabel={deal.discount_label}
          variant="ribbon"
        />
      </div>

      {/* Content section */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-lg font-bold text-foreground mb-1 leading-snug line-clamp-2">
          {deal.title}
        </h3>
        <p className="font-body text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
          {deal.description}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <p className="font-body text-sm font-semibold text-foreground truncate">
            {deal.business_name}
          </p>
          {deal.expires_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-body shrink-0">
              <Clock className="h-3 w-3" />
              <span>
                {expiresLabel}{" "}
                {new Date(deal.expires_at).toLocaleDateString("he-IL")}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DealCard;
