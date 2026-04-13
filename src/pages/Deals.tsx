import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tag, Search, Copy, MessageCircle, Clock, Store, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import PageHero from "@/components/PageHero";
import QuoteSection from "@/components/landing/QuoteSection";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import { usePageCover } from "@/hooks/usePageCover";
import gsap from "gsap";
import DealSubmitForm from "@/components/deals/DealSubmitForm";
import DealBadge from "@/components/deals/DealBadge";

import heroEvents from "@/assets/hero-events.jpg";

const CATEGORIES = ["הכל", "אוכל", "פנאי", "רכב", "לבית", "אופנה", "טכנולוגיה", "בריאות", "כללי"];

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_label: string | null;
  coupon_code: string | null;
  business_name: string;
  business_logo_url: string | null;
  business_phone: string | null;
  website_url: string | null;
  category: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const Deals = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("הכל");
  const [copied, setCopied] = useState(false);
  const coverImage = usePageCover("deals", heroEvents);
  const gridRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, isApproved } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("deals")
        .select("*")
        .eq("is_active", true)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });
      const now = new Date();
      setDeals(
        (data || []).filter(
          (d: any) => !d.expires_at || new Date(d.expires_at) > now
        )
      );
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll(".deal-card");
    if (!cards.length) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.fromTo(
            cards,
            { opacity: 0, y: 30, scale: 0.95 },
            { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.4)" }
          );
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(gridRef.current);
    return () => obs.disconnect();
  }, [deals, filterCategory, searchText]);

  const filtered = deals.filter((d) => {
    const matchCat = filterCategory === "הכל" || d.category === filterCategory;
    const matchSearch =
      !searchText ||
      d.title.includes(searchText) ||
      d.business_name.includes(searchText);
    return matchCat && matchSearch;
  });

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "הקוד הועתק!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const trackClick = async (dealId: string, counterName: string) => {
    await supabase.rpc("increment_deal_counter", {
      deal_id: dealId,
      counter_name: counterName,
    });
  };

  const handleClaimClick = (deal: Deal) => {
    setSelectedDeal(deal);
    trackClick(deal.id, "claim_count");
  };

  const handleWebsiteClick = (deal: Deal) => {
    trackClick(deal.id, "website_click_count");
    const url = deal.website_url!.startsWith("http") ? deal.website_url! : `https://${deal.website_url!}`;
    window.open(url, "_blank");
  };

  const handleWhatsApp = (deal: Deal) => {
    const msg = encodeURIComponent(
      `היי, אני חבר בקהילת הגברים של קרניצי ואשמח למימוש ההטבה: "${deal.title}"`
    );
    const phone = (deal.business_phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  return (
    <>
      <PageHero
        image={coverImage}
        title="הטבות"
        highlight="בלעדיות"
        subtitle="מבצעים והנחות מיוחדות לחברי המועדון בלבד"
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6" dir="rtl">
        {/* Member submit form */}
        {user && isApproved && <DealSubmitForm />}

        {/* Filter bar */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="חיפוש הטבה או עסק..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pr-9 bg-card border-border/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-full px-4 py-1.5 font-body text-xs transition-all border ${
                  filterCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="font-body text-muted-foreground">אין הטבות זמינות כרגע</p>
          </div>
        ) : (
          <div
            ref={gridRef}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((deal) => (
              <div
                key={deal.id}
                className="deal-card group relative rounded-2xl border border-border/40 p-5 backdrop-blur-md bg-card/60 cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.12)] hover:-translate-y-1"
                onClick={() => handleClaimClick(deal)}
              >
                {/* Discount badge */}
                <DealBadge
                  benefitType={(deal as any).benefit_type}
                  benefitValue={(deal as any).benefit_value}
                  discountLabel={deal.discount_label}
                />

                {/* Logo */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl border border-border/40 bg-background/60 flex items-center justify-center overflow-hidden shrink-0">
                    {deal.business_logo_url ? (
                      <img
                        src={deal.business_logo_url}
                        alt={deal.business_name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Store className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-serif text-sm font-bold text-foreground truncate">
                      {deal.business_name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] font-body">
                      {deal.category}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <h3 className="font-serif text-lg font-bold text-foreground mb-2 leading-snug">
                  {deal.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground line-clamp-2">
                  {deal.description}
                </p>

                {/* Expiry */}
                {deal.expires_at && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                    <Clock className="h-3 w-3" />
                    <span>
                      בתוקף עד{" "}
                      {new Date(deal.expires_at).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                )}

                {/* CTA */}
                <Button
                  size="sm"
                  className="mt-4 w-full gradient-gold text-primary-foreground font-body"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClaimClick(deal);
                  }}
                >
                  <Tag className="h-4 w-4 ml-1" />
                  קבל הטבה
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <QuoteSection page="deals" />

      {/* Claim Modal */}
      <Dialog
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      >
        <DialogContent className="sm:max-w-md" dir="rtl">
          {selectedDeal && (
            <>
              {/* Business logo */}
              {selectedDeal.business_logo_url && (
                <div className="flex justify-center -mt-2 mb-2">
                  <div className="h-16 w-16 rounded-2xl border border-border/40 bg-background/80 flex items-center justify-center overflow-hidden shadow-md">
                    <img
                      src={selectedDeal.business_logo_url}
                      alt={selectedDeal.business_name}
                      className="h-full w-full object-contain p-2"
                    />
                  </div>
                </div>
              )}

              <DialogTitle className="font-serif text-xl text-center">
                {selectedDeal.title}
              </DialogTitle>
              <DialogDescription className="text-center font-body text-sm text-muted-foreground mt-1">
                {selectedDeal.business_name}
              </DialogDescription>

              <div className="mt-4 space-y-4">
                <p className="font-body text-sm text-foreground/80 text-center">
                  {selectedDeal.description}
                </p>

                {user && isApproved && selectedDeal.coupon_code && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                    <p className="font-body text-xs text-muted-foreground mb-2">
                      קוד הקופון שלך:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="font-mono text-2xl font-bold text-primary tracking-widest">
                        {selectedDeal.coupon_code}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary"
                        onClick={() => handleCopy(selectedDeal.coupon_code!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {copied && (
                      <p className="mt-1 text-xs text-primary font-body">
                        הועתק!
                      </p>
                    )}
                  </div>
                )}

                {user && isApproved && selectedDeal.business_phone && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-body"
                    onClick={() => handleWhatsApp(selectedDeal)}
                  >
                    <MessageCircle className="h-4 w-4 ml-2" />
                    שלח הודעה בוואטסאפ
                  </Button>
                )}

                {user && isApproved && selectedDeal.website_url && (
                  <Button
                    variant="outline"
                    className="w-full font-body border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => handleWebsiteClick(selectedDeal)}
                  >
                    <ExternalLink className="h-4 w-4 ml-2" />
                    עבור לאתר ההטבה
                  </Button>
                )}

                {(!user || !isApproved) && (
                  <p className="text-center font-body text-sm text-muted-foreground">
                    רק חברים מאושרים יכולים לממש הטבות. הצטרף למועדון כדי ליהנות!
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Deals;
