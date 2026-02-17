import { useEffect, useRef } from "react";
import { Gift } from "lucide-react";

const mockBirthdays = [
  { name: "דוד כהן", date: "18 בפברואר", profession: "אדריכל" },
  { name: "יוסי לוי", date: "20 בפברואר", profession: "עורך דין" },
  { name: "אבי מזרחי", date: "22 בפברואר", profession: "יזם טכנולוגי" },
];

const BirthdaysSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-8");
          }
        });
      },
      { threshold: 0.2 }
    );

    const cards = sectionRef.current?.querySelectorAll(".birthday-card");
    cards?.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 px-6" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-2 font-body text-sm tracking-[0.3em] text-gold/70 uppercase">
            חוגגים השבוע
          </p>
          <h2 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
            ימי הולדת <span className="text-gold">במועדון</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {mockBirthdays.map((person, i) => (
            <div
              key={i}
              className="birthday-card opacity-0 translate-y-8 transition-all duration-700 ease-out rounded-lg border border-gold/20 bg-card p-8 text-center glow-gold hover:border-gold/40"
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
                <Gift className="h-7 w-7 text-gold" />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground">
                {person.name}
              </h3>
              <p className="mt-1 font-body text-sm text-gold">{person.date}</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                {person.profession}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BirthdaysSection;
