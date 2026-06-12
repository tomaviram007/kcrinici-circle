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
    const el = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.fromTo(
            el.querySelector("blockquote"),
            { opacity: 0, y: 30, filter: "blur(8px)" },
            { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.1 }
          )
            .fromTo(
              el.querySelector(".quote-divider"),
              { scaleX: 0, opacity: 0 },
              { scaleX: 1, opacity: 1, duration: 0.7 },
              "-=0.55"
            )
            .fromTo(
              el.querySelector(".quote-author"),
              { opacity: 0, y: 14 },
              { opacity: 1, y: 0, duration: 0.9 },
              "-=0.45"
            );
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [quote]);

  if (!quote) return null;

  const height = quote.section_height || 48;
  const fontSize = quote.font_size || 24;
  const bgImage = quote.background_image_url || heroQuote;

  return (
    <section
      className="relative overflow-hidden"
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
        className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 sm:px-10 md:px-12"
      >
        <blockquote
          className="font-serif font-bold text-white leading-snug drop-shadow-lg max-w-[92%] sm:max-w-3xl md:max-w-4xl mx-auto text-center [text-wrap:balance] opacity-0"
          style={{ fontSize: `clamp(20px, 4.5vw, ${Math.min(fontSize, 48)}px)` }}
        >
          {quote.text}
        </blockquote>
        <span className="quote-divider block mt-4 sm:mt-5 h-px w-12 sm:w-16 bg-gold/60 origin-center opacity-0" />
        <p className="quote-author mt-3 sm:mt-4 font-body text-[11px] sm:text-sm md:text-base text-gold/80 drop-shadow-md text-center tracking-[0.18em] opacity-0">
          {quote.author}{quote.author_title ? ` — ${quote.author_title}` : ""}
        </p>
      </div>
    </section>

  );
};

export default QuoteSection;
