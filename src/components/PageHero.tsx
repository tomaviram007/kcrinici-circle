import { useEffect, useRef } from "react";
import gsap from "gsap";

interface PageHeroProps {
  image: string;
  title: string;
  highlight: string;
  subtitle: string;
  children?: React.ReactNode;
}

const PageHero = ({ image, title, highlight, subtitle, children }: PageHeroProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (bgRef.current) {
        bgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    if (contentRef.current) {
      const els = contentRef.current.children;
      gsap.fromTo(els, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: "power3.out", delay: 0.15 });
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative h-[48vw] min-h-[320px] max-h-[70vh] overflow-hidden">
      <div
        ref={bgRef}
        className="absolute inset-0 bg-cover bg-center scale-110"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/40 to-background" />

      <div ref={contentRef} className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 h-px w-16 gradient-gold opacity-60" />
        <p className="mb-3 font-body text-xs tracking-[0.3em] text-gold uppercase">
          הגברים של ק. קריניצי
        </p>
        <h1 className="font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl md:text-5xl">
          {title} <span className="text-gold">{highlight}</span>
        </h1>
        <p className="mt-3 max-w-lg font-body text-sm text-muted-foreground sm:text-base">
          {subtitle}
        </p>
        {children}
      </div>
    </section>
  );
};

export default PageHero;
