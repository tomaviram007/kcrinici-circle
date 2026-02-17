import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });
      setEvents(eventsData || []);

      if (uid && eventsData?.length) {
        // Fetch user's RSVPs
        const { data: myRsvps } = await supabase
          .from("event_rsvps")
          .select("event_id, status")
          .eq("user_id", uid);
        const rsvpMap: Record<string, string> = {};
        myRsvps?.forEach((r: any) => { rsvpMap[r.event_id] = r.status; });
        setRsvps(rsvpMap);

        // Fetch RSVP counts
        const { data: allRsvps } = await supabase
          .from("event_rsvps")
          .select("event_id")
          .eq("status", "attending");
        const counts: Record<string, number> = {};
        allRsvps?.forEach((r: any) => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
        setRsvpCounts(counts);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (events.length > 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".event-card");
      gsap.fromTo(cards, { opacity: 0, scale: 0.92, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" });
    }
  }, [events]);

  const handleRsvp = async (eventId: string) => {
    if (!userId) return;
    const current = rsvps[eventId];
    if (current === "attending") {
      // Remove RSVP
      await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
      setRsvps((prev) => { const n = { ...prev }; delete n[eventId]; return n; });
      setRsvpCounts((prev) => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] || 1) - 1) }));
      toast({ title: "ביטלת את אישור ההגעה" });
    } else {
      // Upsert RSVP
      await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: userId, status: "attending" }, { onConflict: "event_id,user_id" });
      setRsvps((prev) => ({ ...prev, [eventId]: "attending" }));
      setRsvpCounts((prev) => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }));
      toast({ title: "אישרת הגעה! 🎉" });
    }
  };

  const googleMapsUrl = (location: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-10">
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          אירועים <span className="text-gold">ומפגשים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">מפגשים קרובים לחברי המועדון</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      <div ref={gridRef} className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:auto-rows-[220px]">
        {events.map((event, i) => {
          const date = new Date(event.event_date);
          const spanClass = GRID_SPANS[i % GRID_SPANS.length];
          const bgClass = BG_VARIANTS[i % BG_VARIANTS.length];
          const isAttending = rsvps[event.id] === "attending";
          const count = rsvpCounts[event.id] || 0;

          return (
            <div
              key={event.id}
              className={`event-card group relative overflow-hidden rounded-xl border border-border ${spanClass} flex flex-col justify-between transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]`}
            >
              {/* Background image or color */}
              {event.image_url ? (
                <div className="absolute inset-0">
                  <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>
              ) : (
                <div className={`absolute inset-0 ${bgClass}`} />
              )}

              {/* Date badge */}
              <div className="relative z-10 p-4">
                <div className="inline-flex flex-col items-center rounded-lg bg-background/60 backdrop-blur-sm px-3 py-2 border border-border/50">
                  <span className="font-serif text-2xl font-bold text-gold leading-none">{date.getDate()}</span>
                  <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">
                    {date.toLocaleDateString("he-IL", { month: "short" })}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="relative z-10 mt-auto p-3 sm:p-5">
                <h3 className="font-serif text-base sm:text-xl font-bold text-foreground group-hover:text-gold transition-colors duration-300">
                  {event.title}
                </h3>
                <p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground line-clamp-2">
                  {event.description}
                </p>
                <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-4 font-body text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gold" />
                      {date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {event.location && (
                      <a href={googleMapsUrl(event.location)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gold transition-colors">
                        <MapPin className="h-3.5 w-3.5 text-gold" />
                        {event.location}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className="font-body text-xs text-muted-foreground">{count} מגיעים</span>
                    )}
                    <Button
                      size="sm"
                      variant={isAttending ? "default" : "outline"}
                      onClick={() => handleRsvp(event.id)}
                      className={cn(
                        "font-body text-xs h-7 px-3",
                        isAttending
                          ? "gradient-gold text-primary-foreground"
                          : "border-gold/40 text-gold hover:bg-gold/10"
                      )}
                    >
                      <CheckCircle className="h-3 w-3 ml-1" />
                      {isAttending ? "מגיע ✓" : "אישור הגעה"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Decorative corner */}
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gold/5 rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="font-body text-muted-foreground text-center py-16">אין אירועים קרובים כרגע.</p>
      )}
    </div>
  );
};

// Helper
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default Events;
