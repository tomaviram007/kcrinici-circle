import { useEffect, useState, useRef } from "react";
import { Calendar, MapPin, Lock, CheckCircle, CalendarPlus, X, CreditCard, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import gsap from "gsap";

interface Props {
  isApproved: boolean;
}

const mockEvents = [
  { id: "mock-1", title: "ערב יין וגבינות", description: "טעימות יין בלעדיות לחברי המועדון", event_date: "2026-03-01T19:00:00", location: "מרתף היין, רחוב קריניצי", image_url: null },
  { id: "mock-2", title: "הרצאת נטוורקינג", description: "מפגש עם יזמים ואנשי עסקים", event_date: "2026-03-15T20:00:00", location: "לובי המועדון", image_url: null },
  { id: "mock-3", title: "טורניר שחמט", description: "תחרות ידידותית בין חברי המועדון", event_date: "2026-04-01T18:00:00", location: "חדר המשחקים", image_url: null },
];

const EventsPreviewSection = ({ isApproved }: Props) => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [paymentPopupEvent, setPaymentPopupEvent] = useState<any | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const sectionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      if (isApproved) {
        const { data } = await supabase
          .from("events")
          .select("*")
          .gte("event_date", new Date().toISOString())
          .order("event_date", { ascending: true })
          .limit(3);
        const evts = data || [];
        setEvents(evts);

        if (uid && evts.length > 0) {
          const eventIds = evts.map(e => e.id);
          const [{ data: myRsvps }, { data: allRsvps }] = await Promise.all([
            supabase.from("event_rsvps").select("event_id, status").eq("user_id", uid).in("event_id", eventIds),
            supabase.from("event_rsvps").select("event_id").eq("status", "attending").in("event_id", eventIds),
          ]);
          const rsvpMap: Record<string, string> = {};
          myRsvps?.forEach((r: any) => { rsvpMap[r.event_id] = r.status; });
          setRsvps(rsvpMap);
          const counts: Record<string, number> = {};
          allRsvps?.forEach((r: any) => { counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
          setRsvpCounts(counts);
        }
      }
    };
    init();
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

  const handleRsvp = async (eventId: string) => {
    if (!userId) {
      toast({ title: "יש להתחבר כדי לאשר הגעה", variant: "destructive" });
      return;
    }
    const current = rsvps[eventId];
    if (current === "attending") {
      await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
      setRsvps((prev) => { const n = { ...prev }; delete n[eventId]; return n; });
      setRsvpCounts((prev) => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] || 1) - 1) }));
      toast({ title: "ביטלת את אישור ההגעה" });
    } else {
      await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: userId, status: "attending" }, { onConflict: "event_id,user_id" });
      setRsvps((prev) => ({ ...prev, [eventId]: "attending" }));
      setRsvpCounts((prev) => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }));
      toast({ title: "אישרת הגעה! 🎉" });
    }
  };

  const buildGoogleCalendarUrl = (event: any) => {
    const start = new Date(event.event_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: event.description || "",
      location: event.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const displayEvents = isApproved ? (events.length > 0 ? events : []) : mockEvents;

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

        {displayEvents.length > 0 ? (
        <div className="relative grid gap-4 sm:gap-6 md:grid-cols-3">
          {displayEvents.map((event, i) => (
            <div key={event.id || i} className="event-card opacity-0">
              <div
                onClick={() => isApproved && setSelectedEvent(event)}
                className={`rounded-lg border border-border bg-card p-5 sm:p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)] ${!isApproved ? "select-none" : "cursor-pointer"}`}
              >
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
                {isApproved && rsvpCounts[event.id] > 0 && (
                  <p className="mt-2 font-body text-xs text-gold">{rsvpCounts[event.id]} מגיעים</p>
                )}
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
        ) : (
          <div className="text-center py-8 rounded-lg border border-border bg-card">
            <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">אין אירועים קרובים כרגע</p>
            <Link to="/events" className="font-body text-xs text-gold hover:underline mt-1 inline-block">לכל האירועים ←</Link>
          </div>
        )}

        {isApproved && (
          <div className="mt-8 text-center">
            <Link to="/events" className="font-body text-sm text-gold hover:underline">
              לכל האירועים ←
            </Link>
          </div>
        )}
      </div>

      {/* Event Detail Popup */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent dir="rtl" className="p-0 overflow-hidden max-w-lg">
          <DialogTitle className="sr-only">פרטי אירוע</DialogTitle>
          <DialogDescription className="sr-only">מידע על האירוע</DialogDescription>
          {selectedEvent && (() => {
            const date = new Date(selectedEvent.event_date);
            const isAttending = rsvps[selectedEvent.id] === "attending";
            const count = rsvpCounts[selectedEvent.id] || 0;

            return (
              <>
                {/* Cover image */}
                {selectedEvent.image_url ? (
                  <div className="relative w-full h-48 sm:h-56">
                    <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-gold/40" />
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-foreground">{selectedEvent.title}</h3>
                    <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">{selectedEvent.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-body text-sm text-foreground">
                      <Calendar className="h-4 w-4 text-gold" />
                      <span>
                        {date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        {" · "}
                        {date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {selectedEvent.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-body text-sm text-gold hover:underline"
                      >
                        <MapPin className="h-4 w-4" />
                        {selectedEvent.location}
                      </a>
                    )}
                    {count > 0 && (
                      <p className="font-body text-xs text-muted-foreground">{count} חברים אישרו הגעה</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      onClick={() => handleRsvp(selectedEvent.id)}
                      className={isAttending
                        ? "gradient-gold text-primary-foreground font-body"
                        : "border-gold/40 text-gold hover:bg-gold/10 font-body"
                      }
                      variant={isAttending ? "default" : "outline"}
                    >
                      <CheckCircle className="h-4 w-4 ml-1" />
                      {isAttending ? "מגיע/ה ✓" : "אישור הגעה"}
                    </Button>

                    {isAttending && (
                      <a
                        href={buildGoogleCalendarUrl(selectedEvent)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="outline" className="w-full border-border text-foreground hover:bg-secondary font-body">
                          <CalendarPlus className="h-4 w-4 ml-1" />
                          הוסף ליומן Google
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EventsPreviewSection;
