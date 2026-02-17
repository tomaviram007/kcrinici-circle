import { useEffect, useRef } from "react";
import heroBg from "@/assets/hero-bg.jpg";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Parallax
    const handleScroll = () => {
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${window.scrollY * 0.4}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // GSAP entrance
    if (contentRef.current) {
      const els = contentRef.current.children;
      gsap.fromTo(els, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "power3.out", delay: 0.3 });
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative h-screen overflow-hidden" ref={heroRef}>
      <div
        ref={bgRef}
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />

      <div ref={contentRef} className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 h-px w-24 gradient-gold opacity-60" />
        <p className="mb-4 font-body text-sm tracking-[0.3em] text-gold uppercase">
          מועדון חברים אקסקלוסיבי
        </p>
        <h1 className="font-serif text-5xl font-bold leading-tight text-foreground md:text-7xl lg:text-8xl text-shadow-luxury">
          הגברים של
          <br />
          <span className="text-gold">ק. קריניצי</span>
        </h1>
        <p className="mt-6 max-w-md font-body text-lg text-muted-foreground">
          קהילה סגורה של שכנים, מקצוענים ואנשי עשייה.
          <br />
          ברוכים הבאים למועדון.
        </p>
        <div className="mt-10 flex gap-4">
          <Link to="/register">
            <Button size="lg" className="gradient-gold text-primary-foreground font-body text-base px-8 py-6 hover:opacity-90 transition-opacity">
              הצטרף למועדון
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg" className="border-gold text-gold font-body text-base px-8 py-6 hover:bg-gold/10">
              כניסת חברים
            </Button>
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-8 w-px bg-gold/40" />
      </div>
    </section>
  );
};

export default HeroSection;
