import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, CalendarIcon, ImageIcon, MapPin, Users, ChevronDown, ChevronUp, Bell, Send } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/lib/confetti";
import { validateImageFile } from "@/lib/file-validation";
import { sendTelegramNotification } from "@/lib/telegram-notify";

const EMPTY_FORM = { title: "", description: "", event_date: "", location: "", image_url: "" };

interface RsvpProfile {
  full_name: string;
  profession: string;
  status: string;
}

const AdminEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const [rsvpData, setRsvpData] = useState<Record<string, RsvpProfile[]>>({});
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [rsvpDialogEvent, setRsvpDialogEvent] = useState<any | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);

    // Fetch all RSVPs with profile data
    if (data && data.length > 0) {
      const eventIds = data.map(e => e.id);
      const { data: rsvps } = await supabase
        .from("event_rsvps")
        .select("event_id, status, user_id")
        .in("event_id", eventIds);

      if (rsvps && rsvps.length > 0) {
        const userIds = [...new Set(rsvps.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, profession")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        const grouped: Record<string, RsvpProfile[]> = {};
        
        for (const rsvp of rsvps) {
          if (!grouped[rsvp.event_id]) grouped[rsvp.event_id] = [];
          const profile = profileMap.get(rsvp.user_id);
          grouped[rsvp.event_id].push({
            full_name: profile?.full_name || "לא ידוע",
            profession: profile?.profession || "",
            status: rsvp.status,
          });
        }
        setRsvpData(grouped);
      }
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ ...validation.error!, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("events").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("events").getPublicUrl(path);
      setForm({ ...form, image_url: publicUrl });
      toast({ title: "תמונה הועלתה בהצלחה" });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    const payload = { ...form, image_url: form.image_url || null, created_by: session?.user?.id || null };
    if (editId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editId);
      if (error) {
        toast({ title: "שגיאה בעדכון", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "עודכן!" });
    } else {
      const { error } = await supabase.from("events").insert(payload);
      if (error) {
        toast({ title: "שגיאה בהוספה", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "נוסף!" });
      fireConfetti();
      sendTelegramNotification("new_event", { title: form.title, description: form.description, date: form.event_date, location: form.location });
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditId(null);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "נמחק" });
    fetchEvents();
  };

  const startEdit = (event: any) => {
    setForm({
      title: event.title,
      description: event.description,
      event_date: event.event_date?.slice(0, 16) || "",
      location: event.location || "",
      image_url: event.image_url || "",
    });
    setEditId(event.id);
    setShowForm(true);
  };

  const googleMapsUrl = (location: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  const getAttendingCount = (eventId: string) => (rsvpData[eventId] || []).filter(r => r.status === "attending").length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground">ניהול אירועים</h3>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> הוסף
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת האירוע" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תיאור" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-background" />

          {/* Image URL or Upload */}
          <div className="space-y-2">
            <label className="font-body text-sm text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> תמונת אירוע
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="הדבק קישור לתמונה (URL)"
                value={form.image_url}
                onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted) {
                    e.preventDefault();
                    setForm(f => ({ ...f, image_url: pasted }));
                  }
                }}
                className="bg-background flex-1"
                dir="ltr"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                className="h-10 border-border shrink-0"
                onClick={() => document.getElementById('event-image-upload')?.click()}
              >
                {uploading ? "מעלה..." : "העלה קובץ"}
              </Button>
              <input id="event-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            {form.image_url && (
              <div className="relative w-40 h-24 rounded-md overflow-hidden border border-border">
                <img
                  src={form.image_url}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                />
                <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal bg-background border-border", !form.event_date && "text-muted-foreground")} dir="ltr">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.event_date ? format(new Date(form.event_date), "dd/MM/yyyy", { locale: he }) : "בחר תאריך"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.event_date ? new Date(form.event_date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const existing = form.event_date ? new Date(form.event_date) : new Date();
                        date.setHours(existing.getHours(), existing.getMinutes());
                        setForm({ ...form, event_date: format(date, "yyyy-MM-dd'T'HH:mm") });
                      }
                    }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={form.event_date ? form.event_date.slice(11, 16) : ""}
                onChange={(e) => {
                  const dateStr = form.event_date ? form.event_date.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
                  setForm({ ...form, event_date: `${dateStr}T${e.target.value}` });
                }}
                className="bg-background w-28"
                dir="ltr"
              />
            </div>
            <Input
              placeholder="מיקום (כתובת למפה)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="bg-background"
            />
          </div>
          {form.location && (
            <a href={googleMapsUrl(form.location)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-body text-xs text-gold hover:underline">
              <MapPin className="h-3 w-3" /> צפה במפה
            </a>
          )}
          <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "הוסף"}</Button>
        </form>
      )}

      <div className="space-y-3">
        {events.map((event) => {
          const attending = getAttendingCount(event.id);
          const rsvps = rsvpData[event.id] || [];

          return (
            <div key={event.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} className="w-16 h-16 rounded-md object-cover shrink-0 border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-base font-bold text-foreground">{event.title}</h4>
                  <p className="font-body text-sm text-muted-foreground truncate">{event.description}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-body text-xs text-gold">
                      {event.event_date && new Date(event.event_date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {event.location && (
                      <a href={googleMapsUrl(event.location)} target="_blank" rel="noopener noreferrer" className="font-body text-xs text-gold hover:underline flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </a>
                    )}
                  </div>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    נוצר: {new Date(event.created_at).toLocaleDateString("he-IL")}
                    {event.updated_at !== event.created_at && ` · עודכן: ${new Date(event.updated_at).toLocaleDateString("he-IL")}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(event)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {/* RSVP summary */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rsvps.length > 0 && setRsvpDialogEvent(event)}
                  className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 font-body text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Users className="h-3.5 w-3.5 text-gold" />
                  {attending} אישרו הגעה
                  {rsvps.length > 0 && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* RSVP Dialog */}
      <Dialog open={!!rsvpDialogEvent} onOpenChange={() => setRsvpDialogEvent(null)}>
        <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              מאשרי הגעה – {rsvpDialogEvent?.title}
            </DialogTitle>
            <DialogDescription className="sr-only">רשימת מאשרי הגעה לאירוע</DialogDescription>
          </DialogHeader>
          {rsvpDialogEvent && (
            <div className="space-y-2 mt-2">
              {(rsvpData[rsvpDialogEvent.id] || [])
                .filter(r => r.status === "attending")
                .map((r, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-body text-sm font-medium text-foreground">{r.full_name}</p>
                      <p className="font-body text-xs text-muted-foreground">{r.profession}</p>
                    </div>
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 font-body text-xs text-green-600">מגיע/ה</span>
                  </div>
                ))}
              {(rsvpData[rsvpDialogEvent.id] || []).filter(r => r.status === "attending").length === 0 && (
                <p className="font-body text-sm text-muted-foreground text-center py-4">אין אישורי הגעה עדיין</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEvents;
