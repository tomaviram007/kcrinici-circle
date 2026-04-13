import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, CalendarIcon, ImageIcon, MapPin, Users, ChevronDown, ChevronUp, Bell, Send, Link2, CreditCard, CheckCircle2, XCircle, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { fireConfetti } from "@/lib/confetti";
import { validateImageFile } from "@/lib/file-validation";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import { logAuditAction } from "@/lib/audit-log";
import CreatorBadge from "@/components/admin/CreatorBadge";

const EMPTY_FORM = { title: "", description: "", event_date: "", location: "", image_url: "", payment_link: "", registration_required: false, price: "" };

interface RsvpProfile {
  full_name: string;
  profession: string;
  status: string;
  payment_status: string;
  user_id: string;
  confirmed_at: string;
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
        .select("event_id, status, user_id, payment_status, created_at")
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
            payment_status: rsvp.payment_status || "not_required",
            user_id: rsvp.user_id,
            confirmed_at: rsvp.created_at,
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
    const payload = {
      ...form,
      image_url: form.image_url || null,
      payment_link: form.payment_link || null,
      price: form.price ? parseFloat(form.price) : null,
      created_by: session?.user?.id || null,
    };
    if (editId) {
      const { error } = await supabase.from("events").update(payload).eq("id", editId);
      if (error) {
        toast({ title: "שגיאה בעדכון", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "עודכן!" });
      logAuditAction("update", "event", editId, form.title);
    } else {
      const { error, data: inserted } = await supabase.from("events").insert(payload).select("id").single();
      if (error) {
        toast({ title: "שגיאה בהוספה", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "נוסף!" });
      fireConfetti();
      sendTelegramNotification("new_event", { title: form.title, description: form.description, date: form.event_date, location: form.location });
      logAuditAction("create", "event", inserted?.id, form.title);
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditId(null);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    const event = events.find(e => e.id === id);
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "נמחק" });
    logAuditAction("delete", "event", id, event?.title);
    fetchEvents();
  };

  const startEdit = (event: any) => {
    setForm({
      title: event.title,
      description: event.description,
      event_date: event.event_date?.slice(0, 16) || "",
      location: event.location || "",
      image_url: event.image_url || "",
      payment_link: event.payment_link || "",
      registration_required: event.registration_required || false,
      price: event.price ? String(event.price) : "",
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
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              setSendingReminders(true);
              try {
                const { data, error } = await supabase.functions.invoke("event-reminders");
                if (error) throw error;
                toast({ title: `תזכורות נשלחו`, description: `${data?.sent || 0} הודעות נשלחו בהצלחה` });
              } catch (err: any) {
                toast({ title: "שגיאה בשליחת תזכורות", description: err.message, variant: "destructive" });
              } finally {
                setSendingReminders(false);
              }
            }}
            disabled={sendingReminders}
            className="font-body border-primary/30 text-primary hover:bg-primary/10"
          >
            <Bell className="h-4 w-4 ml-1" />
            {sendingReminders ? "שולח..." : "שלח תזכורות"}
          </Button>
          <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }} className="gradient-gold text-primary-foreground font-body">
            <Plus className="h-4 w-4 ml-1" /> הוסף
          </Button>
        </div>
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

          {/* Payment & Registration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="קישור לתשלום (פייבוקס / ביט)"
              value={form.payment_link}
              onChange={(e) => setForm({ ...form, payment_link: e.target.value })}
              className="bg-background"
              dir="ltr"
            />
            <Input
              placeholder="מחיר (₪)"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="bg-background"
              dir="ltr"
            />
            <label className="flex items-center gap-2 font-body text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.registration_required}
                onChange={(e) => setForm({ ...form, registration_required: e.target.checked })}
                className="rounded border-border"
              />
              נדרשת הרשמה מראש
            </label>
          </div>

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
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <p className="font-body text-xs text-muted-foreground">
                      נוצר: {new Date(event.created_at).toLocaleDateString("he-IL")}
                      {event.updated_at !== event.created_at && ` · עודכן: ${new Date(event.updated_at).toLocaleDateString("he-IL")}`}
                    </p>
                    <CreatorBadge entityType="event" entityId={event.id} createdBy={event.created_by} />
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(event)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {/* RSVP summary */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => rsvps.length > 0 && setRsvpDialogEvent(event)}
                  className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 font-body text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Users className="h-3.5 w-3.5 text-gold" />
                  {attending} אישרו הגעה
                  {rsvps.length > 0 && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </button>
                {event.payment_link && (
                  <>
                    <span className="flex items-center gap-1 rounded-md bg-secondary px-3 py-1.5 font-body text-xs text-foreground">
                      <CreditCard className="h-3.5 w-3.5 text-gold" />
                      {rsvps.filter(r => r.payment_status === "paid").length} שילמו
                    </span>
                    {event.price && (
                      <span className="rounded-md bg-gold/10 px-2 py-1 font-body text-xs text-gold font-semibold">
                        ₪{Number(event.price).toLocaleString()}
                      </span>
                    )}
                    <a href={event.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md bg-primary/10 px-3 py-1.5 font-body text-xs text-primary hover:bg-primary/20 transition-colors">
                      <Link2 className="h-3.5 w-3.5" /> קישור תשלום
                    </a>
                  </>
                )}
                {event.registration_required && (
                  <span className="rounded-md bg-accent/50 px-2 py-1 font-body text-xs text-accent-foreground">📋 הרשמה נדרשת</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* RSVP Dialog */}
      <Dialog open={!!rsvpDialogEvent} onOpenChange={() => setRsvpDialogEvent(null)}>
        <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              נרשמים – {rsvpDialogEvent?.title}
            </DialogTitle>
            <DialogDescription className="sr-only">רשימת נרשמים לאירוע</DialogDescription>
          </DialogHeader>
          {rsvpDialogEvent && (() => {
            const allRsvps = rsvpData[rsvpDialogEvent.id] || [];
            const attendingList = allRsvps.filter(r => r.status === "attending");
            const declinedList = allRsvps.filter(r => r.status === "declined");
            const hasPayment = !!rsvpDialogEvent.payment_link;

            const togglePayment = async (userId: string, newStatus: string) => {
              await supabase
                .from("event_rsvps")
                .update({ payment_status: newStatus })
                .eq("event_id", rsvpDialogEvent.id)
                .eq("user_id", userId);
              fetchEvents();
            };

            return (
              <div className="space-y-4 mt-2">
                {/* Summary */}
                <div className="flex gap-3 text-center">
                  <div className="flex-1 rounded-lg bg-secondary p-2">
                    <p className="font-body text-lg font-bold text-foreground">{attendingList.length}</p>
                    <p className="font-body text-xs text-muted-foreground">מגיעים</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-secondary p-2">
                    <p className="font-body text-lg font-bold text-foreground">{declinedList.length}</p>
                    <p className="font-body text-xs text-muted-foreground">לא מגיעים</p>
                  </div>
                  {hasPayment && (
                    <div className="flex-1 rounded-lg bg-secondary p-2">
                      <p className="font-body text-lg font-bold text-foreground">{attendingList.filter(r => r.payment_status === "paid").length}</p>
                      <p className="font-body text-xs text-muted-foreground">שילמו</p>
                    </div>
                  )}
                </div>

                {/* Attending */}
                <div>
                  <h4 className="font-body text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> מאשרים ({attendingList.length})
                  </h4>
                  {attendingList.length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground text-center py-3">אין אישורי הגעה עדיין</p>
                  ) : (
                    <div className="space-y-1.5">
                      {attendingList.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border border-border p-2.5">
                          <div>
                            <p className="font-body text-sm font-medium text-foreground">{r.full_name}</p>
                            <p className="font-body text-xs text-muted-foreground">{r.profession}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasPayment && (
                              <button
                                onClick={() => togglePayment(r.user_id, r.payment_status === "paid" ? "pending" : "paid")}
                                className={cn(
                                  "flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs transition-colors cursor-pointer",
                                  r.payment_status === "paid"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-destructive/10 text-destructive"
                                )}
                              >
                                <CreditCard className="h-3 w-3" />
                                {r.payment_status === "paid" ? "שולם" : "לא שולם"}
                              </button>
                            )}
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs text-primary">מגיע/ה</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Declined */}
                {declinedList.length > 0 && (
                  <div>
                    <h4 className="font-body text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-destructive" /> לא מגיעים ({declinedList.length})
                    </h4>
                    <div className="space-y-1.5">
                      {declinedList.map((r, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border border-border p-2.5 opacity-60">
                          <div>
                            <p className="font-body text-sm font-medium text-foreground">{r.full_name}</p>
                            <p className="font-body text-xs text-muted-foreground">{r.profession}</p>
                          </div>
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-body text-xs text-destructive">לא מגיע/ה</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEvents;
