import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Lock } from "lucide-react";
import gsap from "gsap";
import { supabase } from "@/integrations/supabase/client";

interface Item {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  condition: string | null;
  category: string | null;
  images: string[] | null;
  is_sold: boolean | null;
  created_at: string;
}

interface Props {
  isApproved: boolean;
}

const SecondHandPreviewSection = ({ isApproved }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      if (isApproved) {
        const { data } = await (supabase as any).rpc("get_member_secondhand");
        setItems(((data || []) as Item[]).slice(0, 3));
      } else {
        const { data } = await (supabase as any).rpc("get_public_secondhand");
        setItems(((data || []) as Item[]).slice(0, 3));
      }
    };
    fetch();
  }, [isApproved]);

  useEffect(() => {
    if (!sectionRef.current || items.length === 0) return;
    const cards = sectionRef.current.querySelectorAll(".sh-card");
    gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" });
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section className="py-8 px-5 sm:py-16 sm:px-6" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-12 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">יד שנייה</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            פריטים <span className="text-gold">למכירה</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to="/secondhand"
              className="sh-card opacity-0 group block rounded-lg overflow-hidden border border-border bg-card transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                {item.images && item.images.length > 0 ? (
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="h-10 w-10 text-gold/40" />
                  </div>
                )}
                {item.is_sold && (
                  <div className="absolute top-2 right-2 rounded bg-red-600/90 px-2 py-0.5 font-body text-xs text-white">נמכר</div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 font-body text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                )}
                {item.price != null && (
                  <p className="mt-2 font-body text-sm font-bold text-gold">
                    {item.currency === "USD" ? "$" : "₪"}{Number(item.price).toLocaleString("he-IL")}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/secondhand"
            className="font-body text-sm text-gold hover:underline inline-flex items-center gap-1.5"
          >
            {!isApproved && <Lock className="h-3.5 w-3.5" />}
            לכל הפריטים
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SecondHandPreviewSection;
