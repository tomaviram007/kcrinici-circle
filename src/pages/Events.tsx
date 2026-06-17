import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, CheckCircle, CalendarPlus, User, X, ChevronLeft, ChevronRight, Search, Pencil, CreditCard, Share2, Copy, MessageCircle, Facebook, Linkedin, Send, Twitter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConfetti } from "@/hooks/useConfetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import EventRegistrationDialog from "@/components/events/EventRegistrationDialog";

import QuoteSection from "@/components/landing/QuoteSection";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import ContentWithSidebarAds from "@/components/ads/ContentWithSidebarAds";
import heroImg from "@/assets/hero-events.jpg";
import { usePageCover } from "@/hooks/usePageCover";
import { isEventEnded } from "@/lib/event-status";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const BG_VARIANTS = [
  "bg-secondary",
  "bg-card",
  "bg-accent",
  "bg-card",
  "bg-secondary",
  "bg-accent",
];

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const Events = () => {
  const [events, setEvents] = useState<any[]>([]);
  const coverImage = usePageCover("events", heroImg);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [registrationEvent, setRegistrationEvent] = useState<any | null>(null);
  const [eventCreator, setEventCreator] = useState<any | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { fireRSVP } = useConfetti();
  const { hasPermission } = useUserPermissions();
  const navigate = useNavigate();
  const { id: eventId } = useParams();
  const canEditEvents = hasPermission("manage_events");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setUserId(uid);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false });
      setEvents(eventsData || []);

      if (eventsData?.length) {
        const { data: allCounts } = await supabase
          .rpc("get_event_participant_counts", { _event_ids: eventsData.map((e: any) => e.id) });
        const counts: Record<string, number> = {};
        (allCounts as any[] | null)?.forEach((r: any) => { counts[r.event_id] = Number(r.participant_count) || 0; });
        setRsvpCounts(counts);
      }

      if (uid && eventsData?.length) {
        const { data: myRsvps } = await supabase
          .from("event_rsvps")
          .select("event_id, status")
          .eq("user_id", uid);
        const rsvpMap: Record<string, string> = {};
        myRsvps?.forEach((r: any) => { rsvpMap[r.event_id] = r.status; });
        setRsvps(rsvpMap);
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

  // Deep-link: auto-open popup when URL contains /events/:id
  useEffect(() => {
    if (eventId && events.length > 0) {
      const event = events.find((e) => e.id === eventId);
      if (event) openEventPopup(event);
    }
  }, [eventId, events]);

  const spotsLeft = (event: any) => {
    if (!event.max_participants) return null;
    return Math.max(0, event.max_participants - (rsvpCounts[event.id] || 0));
  };

  const attemptRsvp = (event: any) => {
    const left = spotsLeft(event);
    if (left === 0 && rsvps[event.id] !== "attending") {
      toast({ title: "האירוע מלא", description: "לא נותרו מקומות פנויים", variant: "destructive" });
      return;
    }
    // Guests and paid events go through the full registration + payment flow
    if (!userId || event.price) {
      setRegistrationEvent(event);
      return;
    }
    const current = rsvps[event.id];
    if (current === "attending") {
      cancelRsvp(event.id);
    } else {
      confirmRsvp(event.id);
    }
  };

  const confirmRsvp = async (eventId: string) => {
    if (!userId) return;
    await supabase.from("event_rsvps").upsert({ event_id: eventId, user_id: userId, status: "attending", payment_status: "pending" }, { onConflict: "event_id,user_id" });
    setRsvps((prev) => ({ ...prev, [eventId]: "attending" }));
    setRsvpCounts((prev) => ({ ...prev, [eventId]: (prev[eventId] || 0) + 1 }));
    fireRSVP();
    toast({ title: "אישרת הגעה! 🎉" });
  };

  const cancelRsvp = async (eventId: string) => {
    if (!userId) return;
    await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", userId);
    setRsvps((prev) => { const n = { ...prev }; delete n[eventId]; return n; });
    setRsvpCounts((prev) => ({ ...prev, [eventId]: Math.max(0, (prev[eventId] || 1) - 1) }));
    toast({ title: "ביטלת את אישור ההגעה" });
  };

  const handleRsvp = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) attemptRsvp(event);
  };

  const openEventPopup = async (event: any) => {
    setSelectedEvent(event);
    setCurrentPhotoIndex(0);
    setEventCreator(null);
    setGalleryPhotos([]);

    // Fetch creator profile
    if (event.created_by) {
      const { data: creator } = await supabase
        .from("profiles")
        .select("full_name, profession, avatar_url, phone")
        .eq("user_id", event.created_by)
        .maybeSingle();
      setEventCreator(creator);
    }

    // Fetch gallery photos linked to this event
    const { data: album } = await supabase
      .from("gallery_albums")
      .select("id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (album) {
      const { data: photos } = await supabase
        .from("gallery_photos")
        .select("image_url")
        .eq("album_id", album.id);
      setGalleryPhotos(photos?.map((p: any) => p.image_url) || []);
    }
  };

  const googleCalendarUrl = (event: any) => {
    const start = new Date(event.event_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: event.description,
      location: event.location || "",
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const googleMapsUrl = (location: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  // All images for the popup carousel
  const getPopupImages = () => {
    const images: string[] = [];
    if (selectedEvent?.image_url) images.push(selectedEvent.image_url);
    images.push(...galleryPhotos);
    return images;
  };

  return (
    <>
    <PageHero image={coverImage} title="אירועים" highlight="ומפגשים" subtitle="מפגשים, ערבי נטוורקינג ואירועים בלעדיים לחברי המועדון" />
    
    <ContentWithSidebarAds targetPage="events">
    <div className="mx-auto max-w-6xl px-5 py-4 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-10">
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          אירועים <span className="text-gold">ומפגשים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">מפגשים קרובים לחברי המועדון</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input placeholder="חיפוש אירוע..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="bg-background w-40 sm:w-52 h-9 font-body text-sm" autoComplete="off" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="bg-background font-body w-32 h-9 text-sm"><SelectValue placeholder="חודש" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל החודשים</SelectItem>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>{new Date(2000, i).toLocaleDateString("he-IL", { month: "long" })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ad below hero area */}
      <div className="mb-6">
        <SmartAdBanner placement="premium" targetPage="events" slotIndex={0} />
      </div>

      {(() => {
        const filtered = events.filter((event) => {
          if (filterMonth !== "all") {
            const month = new Date(event.event_date).getMonth().toString();
            if (month !== filterMonth) return false;
          }
          if (searchText.trim()) {
            const q = searchText.trim().toLowerCase();
            if (!event.title.toLowerCase().includes(q) && !event.description.toLowerCase().includes(q) && !(event.location || "").toLowerCase().includes(q)) return false;
          }
          return true;
        });

        // Insert ads every 5 events
        const MAX_ADS = 4;
        let adSlot = 0;
        const elements: React.ReactNode[] = [];
        filtered.forEach((event, i) => {
          if (i > 0 && i % 5 === 0 && adSlot < MAX_ADS - 1) {
            elements.push(
              <div key={`ad-${adSlot}`} className="break-inside-avoid mb-3 sm:mb-4">
                <SmartAdBanner placement="inline_repeat" targetPage="events" slotIndex={adSlot + 1} />
              </div>
            );
            adSlot++;
          }
          const date = new Date(event.event_date);
          const bgClass = BG_VARIANTS[i % BG_VARIANTS.length];
          const isAttending = rsvps[event.id] === "attending";
          const count = rsvpCounts[event.id] || 0;

          elements.push(
            <div
              key={event.id}
              onClick={() => openEventPopup(event)}
              className={`event-card group relative overflow-hidden rounded-xl border border-border cursor-pointer break-inside-avoid flex flex-col justify-between transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]`}
            >
              {event.image_url ? (
                <div className="relative w-full">
                  <img src={event.image_url} alt={event.title} className="w-full h-auto object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                </div>
              ) : (
                <div className={`w-full h-40 ${bgClass}`} />
              )}

              <div className="absolute top-3 right-3 z-10">
                <div className="inline-flex flex-col items-center rounded-lg bg-background/60 backdrop-blur-sm px-3 py-2 border border-border/50">
                  <span className="font-serif text-2xl font-bold text-gold leading-none">{date.getDate()}</span>
                  <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">
                    {date.toLocaleDateString("he-IL", { month: "short" })}
                  </span>
                </div>
              </div>

              <div className={`p-3 sm:p-5 ${event.image_url ? '' : 'pt-14'}`}>
                <h3 className="font-serif text-base sm:text-xl font-bold text-foreground group-hover:text-gold transition-colors duration-300">
                  {event.title}
                  {event.is_admin_only && (
                    <span className="mr-2 align-middle rounded-full bg-destructive/10 px-2 py-0.5 font-body text-[10px] text-destructive">אדמין בלבד</span>
                  )}
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
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gold" />
                        {event.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {count > 0 && (
                      <span className="font-body text-xs text-muted-foreground">{count} מגיעים</span>
                    )}
                    {event.max_participants && (
                      <span className={cn(
                        "font-body text-xs rounded-full px-2 py-0.5",
                        (event.max_participants - count) <= 0
                          ? "bg-destructive/10 text-destructive"
                          : "bg-gold/10 text-gold"
                      )}>
                        {(event.max_participants - count) <= 0 ? "האירוע מלא" : `נותרו ${event.max_participants - count} מקומות`}
                      </span>
                    )}
                    {isAttending && (
                      <span className="font-body text-xs text-gold flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> מגיע ✓
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gold/5 rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          );
        });

        return (
      <div ref={gridRef} className="columns-1 sm:columns-2 lg:columns-3 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
        {elements}
      </div>
        );
      })()}

      {events.length === 0 && (
        <p className="font-body text-muted-foreground text-center py-16">אין אירועים קרובים כרגע.</p>
      )}
    </div>

    {/* Event Detail Popup */}
    <Dialog open={!!selectedEvent} onOpenChange={(open) => { if (!open) { setSelectedEvent(null); if (eventId) navigate("/events", { replace: true }); } }}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0" dir="rtl">
        <DialogTitle className="sr-only">פרטי אירוע</DialogTitle>
        <DialogDescription className="sr-only">מידע מפורט על האירוע</DialogDescription>
        <button
          onClick={() => setSelectedEvent(null)}
          className="absolute left-4 top-4 z-20 rounded-full bg-background/80 backdrop-blur-sm p-1.5 border border-border hover:bg-background transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {canEditEvents && selectedEvent && (
          <button
            onClick={() => navigate("/admin?tab=events")}
            className="absolute left-14 top-4 z-20 rounded-full bg-gold/20 backdrop-blur-sm p-1.5 border border-gold/30 hover:bg-gold/30 transition-colors"
            title="עריכת אירוע"
          >
            <Pencil className="h-4 w-4 text-gold" />
          </button>
        )}

        {selectedEvent && (() => {
          const date = new Date(selectedEvent.event_date);
          const isAttending = rsvps[selectedEvent.id] === "attending";
          const count = rsvpCounts[selectedEvent.id] || 0;
          const images = getPopupImages();

          return (
            <div className="flex flex-col md:flex-row min-h-[400px]">
              {/* Left side - Image / Gallery */}
              <div className="md:w-1/2 relative bg-secondary flex items-center justify-center min-h-[200px] md:min-h-full">
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentPhotoIndex]}
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentPhotoIndex((prev) => (prev - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur-sm p-1.5 border border-border hover:bg-background transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4 text-foreground" />
                        </button>
                        <button
                          onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/70 backdrop-blur-sm p-1.5 border border-border hover:bg-background transition-colors"
                        >
                          <ChevronRight className="h-4 w-4 text-foreground" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentPhotoIndex(idx)}
                              className={cn(
                                "h-2 w-2 rounded-full transition-all",
                                idx === currentPhotoIndex ? "bg-gold w-4" : "bg-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Calendar className="h-16 w-16 text-gold/30" />
                    <span className="font-body text-sm">אין תמונות לאירוע</span>
                  </div>
                )}
              </div>

              {/* Right side - Info */}
              <div className="md:w-1/2 p-5 sm:p-7 flex flex-col">
                {/* Date badge */}
                <div className="inline-flex self-start flex-col items-center rounded-lg bg-secondary px-3 py-2 border border-border/50 mb-4">
                  <span className="font-serif text-2xl font-bold text-gold leading-none">{date.getDate()}</span>
                  <span className="font-body text-[10px] text-muted-foreground uppercase tracking-wider">
                    {date.toLocaleDateString("he-IL", { month: "long", year: "numeric" })}
                  </span>
                </div>

                <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground mb-2">
                  {selectedEvent.title}
                </h2>
                <p className="font-body text-sm text-muted-foreground leading-relaxed mb-4">
                  {selectedEvent.description}
                </p>

                {/* Details */}
                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-gold shrink-0" />
                    <span>
                      {date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {" • "}
                      {date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {selectedEvent.location && (
                    <a
                      href={googleMapsUrl(selectedEvent.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-gold transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-gold shrink-0" />
                      {selectedEvent.location}
                    </a>
                  )}
                  {count > 0 && (
                    <div className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-gold shrink-0" />
                      <span>{count} מאשרים הגעה</span>
                    </div>
                  )}
                  {selectedEvent.max_participants && (
                    <div className={cn(
                      "flex items-center gap-2 font-body text-sm",
                      (selectedEvent.max_participants - count) <= 0 ? "text-destructive" : "text-gold"
                    )}>
                      <User className="h-4 w-4 shrink-0" />
                      <span>
                        {(selectedEvent.max_participants - count) <= 0
                          ? "האירוע מלא — לא נותרו מקומות"
                          : `נותרו ${selectedEvent.max_participants - count} מקומות מתוך ${selectedEvent.max_participants}`}
                      </span>
                    </div>
                  )}
                  {selectedEvent.price && (
                    <div className="flex items-center gap-2 font-body text-sm text-gold">
                      <CreditCard className="h-4 w-4 shrink-0" />
                      <span>עלות השתתפות: ₪{Number(selectedEvent.price).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedEvent.payment_link && (
                    <a
                      href={selectedEvent.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-body text-sm text-gold hover:underline"
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      קישור לתשלום
                    </a>
                  )}
                </div>

                {/* Creator info */}
                {eventCreator && (
                  <div className="rounded-lg border border-border bg-secondary/50 p-3 mb-5">
                    <p className="font-body text-xs text-muted-foreground mb-2">פורסם על ידי</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary border border-gold/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {eventCreator.avatar_url ? (
                          <img src={eventCreator.avatar_url} alt={eventCreator.full_name} className="h-full w-full object-cover rounded-full" />
                        ) : (
                          <User className="h-5 w-5 text-gold" />
                        )}
                      </div>
                      <div>
                        <p className="font-serif text-sm font-bold text-foreground">{eventCreator.full_name}</p>
                        {eventCreator.profession && (
                          <p className="font-body text-xs text-gold">{eventCreator.profession}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-auto flex flex-col gap-2.5 pt-4 border-t border-border">
                  <Button
                    onClick={(e) => { e.stopPropagation(); attemptRsvp(selectedEvent); }}
                    disabled={spotsLeft(selectedEvent) === 0 && !isAttending}
                    className={cn(
                      "w-full font-body",
                      isAttending
                        ? "gradient-gold text-primary-foreground"
                        : "border-gold/40 text-gold hover:bg-gold/10"
                    )}
                    variant={isAttending ? "default" : "outline"}
                  >
                    <CheckCircle className="h-4 w-4 ml-2" />
                    {isAttending ? "מגיע ✓ — לחץ לביטול" : spotsLeft(selectedEvent) === 0 ? "האירוע מלא" : "אישור הגעה"}
                  </Button>
                  <div className="flex gap-2">
                    <a href={googleCalendarUrl(selectedEvent)} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full font-body border-border text-muted-foreground hover:text-foreground">
                        <CalendarPlus className="h-4 w-4 ml-2" />
                        הוסף ליומן
                      </Button>
                    </a>
                    {(() => {
                      // Remove Apple/iOS private-use-area emojis and other invalid chars
                      // that appear as � on WhatsApp Web, Android, Facebook, etc.
                      const sanitizeForSharing = (s: string) =>
                        (s || "")
                          // Private Use Areas (Apple private emojis, etc.)
                          .replace(/[\uE000-\uF8FF]/g, "")
                          .replace(/[\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu, "")
                          // Unicode replacement char + BOM/zero-width junk
                          .replace(/\uFFFD/g, "")
                          .replace(/[\u200B-\u200F\uFEFF]/g, "")
                          // Collapse 3+ blank lines
                          .replace(/\n{3,}/g, "\n\n")
                          .trim();

                      const buildShareText = () => {
                        const date = new Date(selectedEvent.event_date);
                        const siteUrl = window.location.origin;
                        const eventPageUrl = `${siteUrl}/events/${selectedEvent.id}`;
                        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "https://wzbvdpgoyetmgluvhygf.supabase.co";
                        const eventShareUrl = `${supabaseUrl}/functions/v1/event-share?id=${selectedEvent.id}`;

                        const cleanTitle = sanitizeForSharing(selectedEvent.title);
                        const cleanDescription = sanitizeForSharing(selectedEvent.description || "");

                        let text = "";
                        if (cleanDescription) {
                          text = `🎉 ${cleanTitle}\n\n${cleanDescription}`;
                        } else {
                          text = `🎉 ${cleanTitle}\n📅 ${date.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })} בשעה ${date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
                          if (selectedEvent.location) text += `\n📍 ${sanitizeForSharing(selectedEvent.location)}`;
                          if (selectedEvent.price) text += `\n💰 עלות: ₪${Number(selectedEvent.price).toLocaleString()}`;
                        }
                        text += `\n`;
                        if (selectedEvent.payment_link) text += `\n💳 לתשלום: ${selectedEvent.payment_link}`;
                        text += `\n✅ לאישור הגעה: ${eventShareUrl}`;
                        return { text, eventUrl: eventShareUrl, eventPageUrl };
                      };

                      const copyToClipboard = async () => {
                        const { text } = buildShareText();
                        try {
                          await navigator.clipboard.writeText(text);
                          toast({ title: "הטקסט הועתק ללוח! 📋" });
                        } catch {
                          toast({ title: "לא ניתן להעתיק", variant: "destructive" });
                        }
                      };

                      const { text, eventUrl } = buildShareText();
                      const encodedText = encodeURIComponent(text);
                      const encodedUrl = encodeURIComponent(eventUrl);
                      const encodedTitle = encodeURIComponent(selectedEvent.title);

                      const shareTargets = [
                        { label: "WhatsApp", icon: MessageCircle, color: "text-[#25D366]", url: `https://wa.me/?text=${encodedText}` },
                        { label: "Facebook", icon: Facebook, color: "text-[#1877F2]", url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}` },
                        { label: "LinkedIn", icon: Linkedin, color: "text-[#0A66C2]", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
                        { label: "Telegram", icon: Send, color: "text-[#229ED9]", url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
                        { label: "X / Twitter", icon: Twitter, color: "text-foreground", url: `https://twitter.com/intent/tweet?text=${encodedText}` },
                      ];

                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="font-body border-border text-muted-foreground hover:text-foreground"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent dir="rtl" className="w-56 p-2" align="end">
                            <div className="flex flex-col">
                              {shareTargets.map(({ label, icon: Icon, color, url }) => (
                                <a
                                  key={label}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm text-foreground hover:bg-secondary transition-colors"
                                >
                                  <Icon className={`h-4 w-4 ${color}`} />
                                  <span>{label}</span>
                                </a>
                              ))}
                              <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm text-foreground hover:bg-secondary transition-colors text-right"
                              >
                                <Copy className="h-4 w-4 text-gold" />
                                <span>העתקת טקסט</span>
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(eventUrl);
                                    toast({ title: "הקישור הועתק! 🔗" });
                                  } catch {
                                    toast({ title: "לא ניתן להעתיק", variant: "destructive" });
                                  }
                                }}
                                className="flex items-center gap-3 rounded-md px-3 py-2 font-body text-sm text-foreground hover:bg-secondary transition-colors text-right"
                              >
                                <Copy className="h-4 w-4 text-muted-foreground" />
                                <span>העתקת קישור</span>
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

    {/* Registration + Payment Flow */}
    <EventRegistrationDialog
      event={registrationEvent}
      onClose={() => setRegistrationEvent(null)}
      onRegistered={(eid) => {
        setRsvpCounts((prev) => ({ ...prev, [eid]: (prev[eid] || 0) + 1 }));
        if (userId) {
          supabase.from("event_rsvps").upsert({ event_id: eid, user_id: userId, status: "attending", payment_status: "pending" }, { onConflict: "event_id,user_id" });
          setRsvps((prev) => ({ ...prev, [eid]: "attending" }));
        }
      }}
    />
    </ContentWithSidebarAds>
    <QuoteSection page="events" />
    </>
  );
};

export default Events;
