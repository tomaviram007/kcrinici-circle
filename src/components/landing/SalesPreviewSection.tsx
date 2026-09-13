import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Lock, Banknote, Phone, Share2, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import CategoryImage from "@/components/listings/CategoryImage";
import gsap from "gsap";

interface Props {
  isApproved: boolean;
}

const SalesPreviewSection = ({ isApproved }: Props) => {
  const navigate = useNavigate();
  const { hasPermission } = useUserPermissions();
  const canEditAnnouncements = hasPermission("manage_announcements");
  const { t } = useLanguage();
  const [sales, setSales] = useState<any[]>([]);
  const [creators, setCreators] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await (supabase as any).rpc(
        isApproved ? "get_member_secondhand" : "get_public_secondhand"
      );
      const visibleSales = (data || []).slice(0, 3);
      setSales(visibleSales);

      const ids = [...new Set(visibleSales.map((a: any) => a.created_by).filter(Boolean))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", ids);
        const map: Record<string, any> = {};
        profiles?.forEach((p: any) => { map[p.user_id] = p; });
        setCreators(map);
      }
    };
    fetch();
  }, [isApproved]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const cards = sectionRef.current?.querySelectorAll(".sale-card");
          if (cards) gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" });
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [sales]);

  const buildShareMessage = (item: any) => {
    let msg = `📢 *${item.title}*\n\n${item.description || ""}`;
    if (item.price !== null) msg += `\n\n💰 ₪${Number(item.price).toLocaleString("he-IL")}`;
    if (item.created_by && creators[item.created_by]) {
      const c = creators[item.created_by];
      msg += `\n\n👤 *מפרסם:* ${c.full_name}`;
      if (c.phone) msg += `\n📱 ${c.phone}`;
    }
    msg += "\n\n🏘️ _הגברים של ק.קרניצי_";
    return encodeURIComponent(msg);
  };

  // Hide section entirely when there is no real content
  if (sales.length === 0) return null;

  const displayItems = sales;


  return (
    <section className="py-8 px-5 sm:py-24 sm:px-6 bg-card/50" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-16 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">{t("landing.sales.label")}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {t("landing.sales.title1")} <span className="text-gold">{t("landing.sales.title2")}</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
          {canEditAnnouncements && (
            <button
              onClick={() => navigate("/admin?tab=announcements")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3 py-1.5 font-body text-xs text-gold hover:bg-gold/30 transition-colors"
            >
              <Pencil className="h-3 w-3" /> {t("announcements.editBtn")}
            </button>
          )}
        </div>

        {displayItems.length > 0 ? (
          <div className="relative grid gap-4 sm:gap-6 md:grid-cols-3">
            {displayItems.map((item, i) => (
              <div
                key={item.id || i}
                className="sale-card opacity-0"
                onClick={() => setSelected(item)}
              >
                <div className="cursor-pointer rounded-lg border border-border bg-card p-5 sm:p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]">
                  <div className="mb-4 rounded-md overflow-hidden h-36">
                    <CategoryImage category={item.category} src={item.images?.[0]} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                      <ShoppingBag className="h-5 w-5 text-gold" />
                    </div>
                    <span className="font-body text-xs text-gold/70">{item.category || "מכירה"}</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground line-clamp-2">{item.description}</p>
                  {item.price !== null && (
                    <p className="mt-2 font-body text-sm font-bold text-gold flex items-center gap-1">
                      <Banknote className="h-3.5 w-3.5" /> ₪{Number(item.price).toLocaleString("he-IL")}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-body text-xs text-muted-foreground">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString("he-IL") : ""}
                      {item.created_by && creators[item.created_by] && <> • {creators[item.created_by].full_name}</>}
                    </span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        ) : (
          <div className="text-center py-8 rounded-lg border border-border bg-card">
            <ShoppingBag className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">{t("landing.sales.noSales")}</p>
            <Link to="/events" className="font-body text-xs text-gold hover:underline mt-1 inline-block">{t("landing.sales.postSale")}</Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/secondhand" className="font-body text-sm text-gold hover:underline">
            {t("landing.sales.allSales")}
          </Link>
        </div>
      </div>

      {/* Sale Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent dir="rtl" className="inset-x-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-x-0 p-5 pt-14 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6">
          <DialogTitle className="sr-only">{t("landing.sales.detailsTitle")}</DialogTitle>
          <DialogDescription className="sr-only">פרטי המודעה</DialogDescription>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg overflow-hidden h-56">
                <CategoryImage category={selected.category} src={selected.images?.[0]} alt={selected.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="font-body text-xs text-gold/70">{selected.category || "מכירה"}</span>
                <h3 className="font-serif text-2xl font-bold text-foreground mt-1">{selected.title}</h3>
              </div>
              <p className="font-body text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{selected.description}</p>
              {selected.price !== null && <p className="font-serif text-3xl font-bold text-gold">₪{Number(selected.price).toLocaleString("he-IL")}</p>}
              {selected.created_by && creators[selected.created_by] && (
                <div className="border-t border-border pt-4 space-y-1">
                  <p className="font-body text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-gold" /> {creators[selected.created_by].full_name}
                  </p>
                  {creators[selected.created_by].phone && (
                    <p className="font-body text-sm text-muted-foreground">📱 {creators[selected.created_by].phone}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${buildShareMessage(selected)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-2 font-body text-sm text-green-600 hover:bg-green-600/20 transition-colors"
                >
                  <Share2 className="h-4 w-4" /> {t("landing.sales.whatsapp")}
                </a>
              </div>
              <p className="font-body text-xs text-muted-foreground">
                פורסם: {new Date(selected.created_at).toLocaleDateString("he-IL")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default SalesPreviewSection;
