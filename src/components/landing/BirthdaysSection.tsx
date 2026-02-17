import { useEffect, useRef } from "react";
import { Gift } from "lucide-react";
import gsap from "gsap";

const mockBirthdays = [
  { name: "דוד כהן", date: "18 בפברואר", profession: "אדריכל" },
  { name: "יוסי לוי", date: "20 בפברואר", profession: "עורך דין" },
  { name: "אבי מזרחי", date: "22 בפברואר", profession: "יזם טכנולוגי" },
];

const createConfetti = (container: HTMLElement) => {
  const colors = ["#D4AF37", "#C5961D", "#E6C547", "#B8860B", "#FFD700"];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;width:${4 + Math.random() * 6}px;height:${4 + Math.random() * 6}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? "50%" : "0"};pointer-events:none;opacity:0;`;
    container.appendChild(el);
    gsap.fromTo(el,
      { opacity: 1, x: container.offsetWidth / 2, y: container.offsetHeight / 2 },
      {
        x: Math.random() * container.offsetWidth,
        y: -50 - Math.random() * 200,
        rotation: Math.random() * 720,
        opacity: 0,
        duration: 1.5 + Math.random(),
        ease: "power2.out",
        delay: Math.random() * 0.5,
        onComplete: () => el.remove(),
      }
    );
  }
};

const BirthdaysSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const confettiTriggered = useRef(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = sectionRef.current?.querySelectorAll(".birthday-card");
            if (cards) {
              gsap.fromTo(cards, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.15, ease: "back.out(1.3)" });
            }
            if (!confettiTriggered.current && sectionRef.current) {
              confettiTriggered.current = true;
              setTimeout(() => createConfetti(sectionRef.current!), 600);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 px-6 overflow-hidden" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-2 font-body text-sm tracking-[0.3em] text-gold/70 uppercase">חוגגים השבוע</p>
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            ימי הולדת <span className="text-gold">במועדון</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {mockBirthdays.map((person, i) => (
            <div
              key={i}
              className="birthday-card opacity-0 rounded-lg border border-gold/20 bg-card p-8 text-center glow-gold hover:border-gold/40 transition-colors"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
                <Gift className="h-7 w-7 text-gold" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">{person.name}</h3>
              <p className="mt-1 font-body text-sm text-gold">{person.date}</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">{person.profession}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BirthdaysSection;
