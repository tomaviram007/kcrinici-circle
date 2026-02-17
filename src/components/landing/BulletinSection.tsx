import { useEffect, useRef } from "react";
import { Briefcase, Users, Calendar } from "lucide-react";
import gsap from "gsap";

const features = [
  {
    icon: Briefcase,
    title: "הזדמנויות בשכונה",
    description: "לוח דרושים אקסקלוסיבי – עסקאות, שותפויות ומשרות בין חברי המועדון.",
  },
  {
    icon: Users,
    title: "אינדקס החברים",
    description: "גלריה של אנשי המקצוע בשכונה – תמיד תדע למי לפנות.",
  },
  {
    icon: Calendar,
    title: "אירועים ומפגשים",
    description: "ערבי יין, הרצאות ומפגשי נטוורקינג בלעדיים לחברי המועדון.",
  },
];

const BulletinSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = sectionRef.current?.querySelectorAll(".bulletin-card");
            if (cards) {
              gsap.fromTo(cards, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "power3.out" });

              // Float effect on hover
              cards.forEach((card) => {
                const el = card as HTMLElement;
                el.addEventListener("mouseenter", () => {
                  gsap.to(el, { y: -8, duration: 0.3, ease: "power2.out" });
                });
                el.addEventListener("mouseleave", () => {
                  gsap.to(el, { y: 0, duration: 0.4, ease: "power2.out" });
                });
              });
            }
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 px-6 bg-card/50" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-2 font-body text-sm tracking-[0.3em] text-gold/70 uppercase">לוח המודעות</p>
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            מה חדש <span className="text-gold">במועדון</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, i) => (
            <div key={i} className="bulletin-card opacity-0">
              <div className="rounded-lg border border-border bg-card p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
                  <feature.icon className="h-7 w-7 text-gold" />
                </div>
                <h3 className="mb-3 font-serif text-2xl font-bold text-foreground">{feature.title}</h3>
                <p className="font-body text-base leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BulletinSection;
