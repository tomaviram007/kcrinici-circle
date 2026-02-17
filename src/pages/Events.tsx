import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin } from "lucide-react";
import gsap from "gsap";

const Events = () => {
  const [events, setEvents] = useState<any[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("events").select("*").gte("event_date", new Date().toISOString()).order("event_date", { ascending: true });
      setEvents(data || []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (events.length > 0 && listRef.current) {
      const cards = listRef.current.querySelectorAll(".event-card");
      gsap.fromTo(cards, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.12, ease: "power3.out" });
    }
  }, [events]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          אירועים <span className="text-gold">ומפגשים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">מפגשים קרובים לחברי המועדון</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      <div ref={listRef} className="space-y-4">
        {events.map((event) => {
          const date = new Date(event.event_date);
          return (
            <div key={event.id} className="event-card flex gap-5 rounded-lg border border-border bg-card p-6 transition-all hover:border-gold/20">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-secondary px-4 py-3 min-w-[70px]">
                <span className="font-serif text-2xl font-bold text-gold">{date.getDate()}</span>
                <span className="font-body text-xs text-muted-foreground">{date.toLocaleDateString("he-IL", { month: "short" })}</span>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-foreground">{event.title}</h3>
                <p className="mt-1 font-body text-sm text-muted-foreground">{event.description}</p>
                <div className="mt-3 flex items-center gap-4 font-body text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-gold" />
                    {date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-gold" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {events.length === 0 && <p className="font-body text-muted-foreground">אין אירועים קרובים כרגע.</p>}
    </div>
  );
};

export default Events;
