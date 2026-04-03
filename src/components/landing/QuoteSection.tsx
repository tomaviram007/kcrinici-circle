import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "lucide-react";
import gsap from "gsap";
import heroQuote from "@/assets/hero-quote.jpg";

interface QuoteData {
  id: string;
  text: string;
  author: string;
  author_title: string;
  background_image_url: string | null;
  section_height: number | null;
  font_size: number | null;
}

interface QuoteSectionProps {
  page?: string;
}

const QuoteSection = ({ page = "home" }: QuoteSectionProps) => {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, text, author, author_title, background_image_url, section_height, font_size, page_location")
        .eq("is_active", true)
        .eq("page_location", page);
      if (data && data.length > 0) {
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
        );
        setQuote(data[dayOfYear % data.length]);
      }
    };
    fetchQuote();

    const channel = supabase
      .channel(`quotes-realtime-${page}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotes" }, () => { fetchQuote(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [page]);

  useEffect(() => {
    const handleScroll = () => {
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!ref.current || !quote) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          gsap.fromTo(
            ref.current!.children,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: "power3.out" }
          );
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [quote]);

  if (!quote) return null;

  const height = quote.section_height || 48;
  const fontSize = quote.font_size || 24;
  const bgImage = quote.background_image_url || heroQuote;

  return (
    <section
      className="relative overflow-hidden flex items-center justify-center py-16 sm:py-0"
      style={{ minHeight: "260px", height: `clamp(260px, ${height}vw, 90vh)` }}
    >
      <div
        ref={bgRef}
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" />

      <div
        ref={ref}
        className="relative z-10 flex flex-col items-center justify-center px-6 sm:px-12 text-center max-w-4xl mx-auto"
      >
        <blockquote
          className="font-serif font-bold text-white leading-snug opacity-0 drop-shadow-lg"
          style={{ fontSize: `clamp(18px, 3vw, ${Math.min(fontSize, 48)}px)` }}
        >
          {quote.text}
        </blockquote>
        <p className="mt-3 sm:mt-4 font-body text-xs sm:text-base text-gold/80 opacity-0 drop-shadow-md tracking-wide">
          {quote.author}{quote.author_title ? ` — ${quote.author_title}` : ""}
        </p>
      </div>
    </section>
  );
};

export default QuoteSection;
