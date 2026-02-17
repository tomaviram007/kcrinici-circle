import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";
import gsap from "gsap";

const GRID_SPANS = [
  "md:col-span-1 md:row-span-2",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-1 md:row-span-2",
];

const BG_VARIANTS = [
  "bg-secondary",
  "bg-card",
  "bg-accent",
  "bg-card",
  "bg-secondary",
  "bg-accent",
];

const Events = () => {
  const [events, setEvents] = useState<any[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      setEvents(data || []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (events.length > 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".event-card");
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.92, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" }
      );
    }
  }, [events]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          אירועים <span className="text-gold">ומפגשים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          מפגשים קרובים לחברי המועדון
        </p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      <div
        ref={gridRef}
        className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[220px]"
      >
        {events.map((event, i) => {
          const date = new Date(event.event_date);
          const spanClass = GRID_SPANS[i % GRID_SPANS.length];
          const bgClass = BG_VARIANTS[i % BG_VARIANTS.length];

          return (
            <div
              key={event.id}
              className={`event-card group relative overflow-hidden rounded-xl border border-border ${bgClass} p-6 flex flex-col justify-between transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)] ${spanClass}`}
            >
              {/* Date badge */}
              <div className="absolute top-4 left-4 flex flex-col items-center rounded-lg bg-background/60 backdrop-blur-sm px-3 py-2 border border-border/50">
                <span className="font-serif text-2xl font-bold text-gold leading-none">
                  {date.getDate()}
                </span>
                <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">
                  {date.toLocaleDateString("he-IL", { month: "short" })}
                </span>
              </div>

              {/* Content */}
              <div className="mt-auto">
                <h3 className="font-serif text-xl font-bold text-foreground group-hover:text-gold transition-colors duration-300">
                  {event.title}
                </h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {event.description}
                </p>
                <div className="mt-3 flex items-center gap-4 font-body text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gold" />
                    {date.toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gold" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>

              {/* Decorative corner */}
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gold/5 rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="font-body text-muted-foreground text-center py-16">
          אין אירועים קרובים כרגע.
        </p>
      )}
    </div>
  );
};

export default Events;
