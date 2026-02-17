import { useEffect, useState, useRef } from "react";
import { Calendar, MapPin, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import gsap from "gsap";

interface Props {
  isApproved: boolean;
}

const mockEvents = [
  { title: "ערב יין וגבינות", description: "טעימות יין בלעדיות לחברי המועדון", event_date: "2026-03-01T19:00:00", location: "מרתף היין, רחוב קריניצי" },
  { title: "הרצאת נטוורקינג", description: "מפגש עם יזמים ואנשי עסקים", event_date: "2026-03-15T20:00:00", location: "לובי המועדון" },
  { title: "טורניר שחמט", description: "תחרות ידידותית בין חברי המועדון", event_date: "2026-04-01T18:00:00", location: "חדר המשחקים" },
];

const EventsPreviewSection = ({ isApproved }: Props) => {
  const [events, setEvents] = useState<any[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isApproved) {
      supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3)
        .then(({ data }) => setEvents(data || []));
    }
  }, [isApproved]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = sectionRef.current?.querySelectorAll(".event-card");
            if (cards) gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" });
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [events]);

  const displayEvents = isApproved && events.length > 0 ? events : mockEvents;

  return (
    <section className="py-12 px-4 sm:py-24 sm:px-6" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-16 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">אירועים קרובים</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            מה <span className="text-gold">בתוכנית</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="relative grid gap-4 sm:gap-6 md:grid-cols-3">
          {displayEvents.map((event, i) => (
            <div key={i} className="event-card opacity-0">
              <div className={`rounded-lg border border-border bg-card p-5 sm:p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)] ${!isApproved ? "select-none" : ""}`}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
                  <Calendar className="h-6 w-6 text-gold" />
                </div>
                <h3 className={`font-serif text-xl font-bold text-foreground ${!isApproved ? "blur-[3px]" : ""}`}>{event.title}</h3>
                <p className={`mt-2 font-body text-sm leading-relaxed text-muted-foreground ${!isApproved ? "blur-[4px]" : ""}`}>{event.description}</p>
                <div className={`mt-4 flex items-center gap-2 text-xs text-gold/70 font-body ${!isApproved ? "blur-[4px]" : ""}`}>
                  <MapPin className="h-3 w-3" />
                  <span>{event.location}</span>
                </div>
                <p className={`mt-1 font-body text-xs text-muted-foreground ${!isApproved ? "blur-[4px]" : ""}`}>
                  {new Date(event.event_date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}

          {!isApproved && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Link to="/register" className="flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 backdrop-blur-sm px-6 py-3 font-body text-sm text-gold hover:bg-gold/10 transition-colors">
                <Lock className="h-4 w-4" />
                הצטרף כדי לראות
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EventsPreviewSection;
