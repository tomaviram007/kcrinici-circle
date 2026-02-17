import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Quote } from "lucide-react";
import gsap from "gsap";

interface QuoteData {
  id: string;
  text: string;
  author: string;
  author_title: string;
}

const QuoteSection = () => {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("quotes")
        .select("id, text, author, author_title")
        .eq("is_active", true);
      if (data && data.length > 0) {
        // Pick quote based on day of year for daily rotation
        const dayOfYear = Math.floor(
          (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
        );
        setQuote(data[dayOfYear % data.length]);
      }
    };
    fetch();
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

  return (
    <section className="relative py-16 px-4 sm:py-24 overflow-hidden">
      {/* Warm vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/60 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_hsl(var(--background))_100%)]" />

      <div
        ref={ref}
        className="relative z-10 mx-auto max-w-2xl text-center flex flex-col items-center"
      >
        <Quote className="h-8 w-8 text-gold/30 mb-6 rotate-180" />
        <blockquote className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-relaxed opacity-0">
          {quote.text}
        </blockquote>
        <div className="mt-6 h-px w-12 gradient-gold opacity-40 opacity-0" />
        <p className="mt-4 font-body text-sm sm:text-base text-gold opacity-0">
          {quote.author}
        </p>
        <p className="font-body text-xs text-muted-foreground opacity-0">
          {quote.author_title}
        </p>
      </div>
    </section>
  );
};

export default QuoteSection;
