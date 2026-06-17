import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { isEventEnded } from "@/lib/event-status";

const EMPTY_FORM = { title: "", description: "", event_date: "", end_date: "", location: "", waze_url: "", image_url: "", payment_link: "", registration_required: true, price: "", max_participants: "", is_admin_only: false };

interface RsvpProfile {
  full_name: string;
  profession: string;
  status: string;
  payment_status: string;
  user_id: string;
  confirmed_at: string;
}

interface Registration {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  attendance_confirmed: boolean;
  payment_status: string;
  amount_paid: number | null;
  transaction_ref: string | null;
  created_at: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  paid: "שולם",
  pending: "תשלום ממתין",
  unpaid: "לא שולם",
  not_required: "ללא תשלום",
};

const NEXT_PAYMENT_STATUS: Record<string, string> = {
  pending: "paid",
  unpaid: "paid",
  not_required: "paid",
  paid: "unpaid",
};

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
  const [registrationData, setRegistrationData] = useState<Record<string, Registration[]>>({});
  const [regFilter, setRegFilter] = useState("all");
  const [removalsData, setRemovalsData] = useState<Record<string, any[]>>({});
  const [removeTarget, setRemoveTarget] = useState<{ type: "registration" | "rsvp"; name: string; data: any; event: any } | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [removeReason, setRemoveReason] = useState("לא שילם");
  const [removeNote, setRemoveNote] = useState("");

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

      const { data: registrations } = await supabase
        .from("event_registrations")
        .select("*")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });
      const regGrouped: Record<string, Registration[]> = {};
      for (const reg of (registrations as Registration[] | null) || []) {
        if (!regGrouped[reg.event_id]) regGrouped[reg.event_id] = [];
        regGrouped[reg.event_id].push(reg);
      }
      setRegistrationData(regGrouped);

      const { data: removals } = await supabase
        .from("event_participant_removals")
        .select("*")
        .in("event_id", eventIds)
        .order("removed_at", { ascending: false });
      const remGrouped: Record<string, any[]> = {};
      for (const rem of removals || []) {
        if (!remGrouped[rem.event_id!]) remGrouped[rem.event_id!] = [];
        remGrouped[rem.event_id!].push(rem);
      }
      setRemovalsData(remGrouped);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!removeTarget) return;
    if (confirmName.trim() !== removeTarget.name.trim()) {
      toast({ title: "השם שהוקלד אינו תואם", description: "יש להקליד את שם המשתתף במדויק כדי לאשר מחיקה", variant: "destructive" });
      return;
    }
    const reason = removeReason === "אחר" && removeNote.trim() ? `אחר: ${removeNote.trim()}` : removeReason;
    const { data: { session } } = await supabase.auth.getSession();

    const { error: logError } = await supabase.from("event_participant_removals").insert({
      event_id: removeTarget.event.id,
      event_title: removeTarget.event.title,
      participant_name: removeTarget.name,
      email: removeTarget.type === "registration" ? removeTarget.data.email : null,
      phone: removeTarget.type === "registration" ? removeTarget.data.phone : null,
      source: removeTarget.type,
      payment_status: removeTarget.data.payment_status || null,
      reason,
      removed_by: session?.user?.id || null,
    });
    if (logError) {
      toast({ title: "שגיאה בתיעוד ההסרה", description: logError.message, variant: "destructive" });
      return;
    }

    if (removeTarget.type === "registration") {
      await supabase.from("event_registrations").delete().eq("id", removeTarget.data.id);
    } else {
      await supabase.from("event_rsvps").delete().eq("event_id", removeTarget.event.id).eq("user_id", removeTarget.data.user_id);
    }
    logAuditAction("delete", "event", removeTarget.event.id, `הסרת משתתף: ${removeTarget.name} (${reason})`);
    toast({ title: "המשתתף הוסר", description: `${removeTarget.name} — ${reason}` });
    setRemoveTarget(null);
    setConfirmName("");
    setRemoveNote("");
    setRemoveReason("לא שילם");
    fetchEvents();
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
    
    // Convert local datetime to ISO with timezone offset so the DB stores it correctly
    const toISO = (val: string) => {
      if (!val) return null;
      if (val.includes('+') || val.includes('Z')) return val;
      return new Date(val).toISOString();
    };

    const payload = {
      ...form,
      event_date: toISO(form.event_date)!,
      end_date: toISO(form.end_date),
      image_url: form.image_url || null,
      payment_link: form.payment_link || null,
      waze_url: form.waze_url || null,
      location: form.location || null,
      price: form.price ? parseFloat(form.price) : null,
      max_participants: form.max_participants ? parseInt(form.max_participants) : null,
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
    const toLocal = (iso: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setForm({
      title: event.title,
      description: event.description,
      event_date: toLocal(event.event_date),
      end_date: toLocal(event.end_date),
      location: event.location || "",
      waze_url: event.waze_url || "",
      image_url: event.image_url || "",
      payment_link: event.payment_link || "",
      registration_required: event.registration_required ?? true,
      price: event.price ? String(event.price) : "",
      max_participants: event.max_participants ? String(event.max_participants) : "",
      is_admin_only: event.is_admin_only || false,
    });
    setEditId(event.id);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
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

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start date + time */}
              <div className="space-y-1.5">
                <label className="font-body text-xs text-muted-foreground">תאריך ושעת התחלה</label>
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
                            const existing = form.event_date ? new Date(form.event_date) : null;
                            const hh = existing ? existing.getHours() : 17;
                            const mm = existing ? existing.getMinutes() : 0;
                            date.setHours(hh, mm);
                            setForm({ ...form, event_date: format(date, "yyyy-MM-dd'T'HH:mm") });
                          }
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Time24Input
                    value={form.event_date ? form.event_date.slice(11, 16) : "17:00"}
                    onChange={(time) => {
                      const dateStr = form.event_date ? form.event_date.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
                      setForm({ ...form, event_date: `${dateStr}T${time || "17:00"}` });
                    }}
                    className="w-28"
                  />
                </div>
              </div>

              {/* End date + time (optional) */}
              <div className="space-y-1.5">
                <label className="font-body text-xs text-muted-foreground">תאריך ושעת סיום (אופציונלי)</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal bg-background border-border", !form.end_date && "text-muted-foreground")} dir="ltr">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.end_date ? format(new Date(form.end_date), "dd/MM/yyyy", { locale: he }) : "בחר תאריך סיום"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.end_date ? new Date(form.end_date) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const existing = form.end_date ? new Date(form.end_date) : null;
                            const startD = form.event_date ? new Date(form.event_date) : null;
                            const hh = existing ? existing.getHours() : (startD ? Math.min(23, startD.getHours() + 2) : 22);
                            const mm = existing ? existing.getMinutes() : (startD ? startD.getMinutes() : 0);
                            date.setHours(hh, mm);
                            setForm({ ...form, end_date: format(date, "yyyy-MM-dd'T'HH:mm") });
                          }
                        }}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Time24Input
                    value={form.end_date ? form.end_date.slice(11, 16) : ""}
                    onChange={(time) => {
                      const dateStr = form.end_date
                        ? form.end_date.slice(0, 10)
                        : (form.event_date ? form.event_date.slice(0, 10) : format(new Date(), "yyyy-MM-dd"));
                      setForm({ ...form, end_date: time ? `${dateStr}T${time}` : "" });
                    }}
                    className="w-28"
                  />
                  {form.end_date && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, end_date: "" })} className="text-muted-foreground" title="נקה שעת סיום">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="מיקום (כתובת למפה)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="bg-background"
              />
              <Input
                placeholder="קישור Waze לניווט (אופציונלי)"
                value={form.waze_url}
                onChange={(e) => setForm({ ...form, waze_url: e.target.value })}
                className="bg-background"
                dir="ltr"
              />
            </div>
          </div>
          {form.location && (
            <div className="flex flex-wrap gap-3">
              <a href={googleMapsUrl(form.location)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-body text-xs text-gold hover:underline">
                <MapPin className="h-3 w-3" /> צפה במפה (Google)
              </a>
              {form.waze_url && (
                <a href={form.waze_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-body text-xs text-gold hover:underline">
                  <MapPin className="h-3 w-3" /> פתח ב-Waze
                </a>
              )}
            </div>
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
              נדרש אישור הגעה (RSVP)
            </label>
          </div>

          {/* Capacity & visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="מקסימום משתתפים (ריק = ללא הגבלה)"
              type="number"
              min="1"
              step="1"
              value={form.max_participants}
              onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
              className="bg-background"
              dir="ltr"
            />
            <label className="flex items-center gap-2 font-body text-sm text-foreground cursor-pointer sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_admin_only}
                onChange={(e) => setForm({ ...form, is_admin_only: e.target.checked })}
                className="rounded border-border"
              />
              אירוע בדיקה — מוצג לאדמינים בלבד 🔒
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
            <div key={event.id} className={`rounded-lg border border-border bg-card p-4 space-y-3 ${isEventEnded(event) ? "opacity-75" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                {event.image_url && (
                  <img src={event.image_url} alt={event.title} onClick={() => startEdit(event)} className={`w-16 h-16 rounded-md object-cover shrink-0 border border-border cursor-pointer hover:opacity-80 transition-opacity ${isEventEnded(event) ? "grayscale opacity-70" : ""}`} />
                )}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEdit(event)} title="לחצו לעריכת האירוע">
                  <h4 className="font-serif text-base font-bold text-foreground hover:text-gold transition-colors inline-flex items-center gap-2 flex-wrap">
                    {event.title}
                    {isEventEnded(event) && (
                      <span className="inline-flex items-center rounded-full bg-destructive/15 text-destructive border border-destructive/30 px-2 py-0.5 font-body text-[10px] font-semibold">
                        האירוע הסתיים
                      </span>
                    )}
                  </h4>
                  <p className="font-body text-sm text-muted-foreground truncate">{event.description}</p>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-body text-xs text-gold">
                      {event.event_date && new Date(event.event_date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {event.location && (
                      <a href={googleMapsUrl(event.location)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-body text-xs text-gold hover:underline flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {event.location}
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => (rsvps.length > 0 || (registrationData[event.id] || []).length > 0) && setRsvpDialogEvent(event)}
                  className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 font-body text-xs text-foreground hover:bg-secondary/80 transition-colors"
                >
                  <Users className="h-3.5 w-3.5 text-gold" />
                  {attending} אישרו הגעה · {(registrationData[event.id] || []).length} נרשמו בטופס
                  {(rsvps.length > 0 || (registrationData[event.id] || []).length > 0) && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
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
                {event.max_participants && (
                  <span className={cn(
                    "rounded-md px-2 py-1 font-body text-xs",
                    (attending + (registrationData[event.id] || []).length) >= event.max_participants
                      ? "bg-destructive/10 text-destructive"
                      : "bg-secondary text-foreground"
                  )}>
                    👥 מוגבל ל-{event.max_participants} משתתפים
                  </span>
                )}
                {event.is_admin_only && (
                  <span className="rounded-md bg-destructive/10 px-2 py-1 font-body text-xs text-destructive">🔒 אדמין בלבד</span>
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

            const allRegs = registrationData[rsvpDialogEvent.id] || [];
            const filteredRegs = allRegs.filter(r => {
              if (regFilter === "paid") return r.payment_status === "paid";
              if (regFilter === "unpaid") return r.payment_status === "unpaid" || r.payment_status === "pending";
              if (regFilter === "confirmed") return r.attendance_confirmed;
              return true;
            });

            const toggleRegPayment = async (reg: Registration) => {
              const newStatus = NEXT_PAYMENT_STATUS[reg.payment_status] || "paid";
              await supabase
                .from("event_registrations")
                .update({
                  payment_status: newStatus,
                  amount_paid: newStatus === "paid" ? (rsvpDialogEvent.price ?? reg.amount_paid) : null,
                })
                .eq("id", reg.id);
              fetchEvents();
            };

            const csvDownload = (headers: string[], rows: (string | number)[][], filename: string) => {
              const bom = "﻿";
              const escapeCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
              const csv = bom + [headers, ...rows].map(r => r.map(escapeCell).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              a.click();
              URL.revokeObjectURL(url);
            };

            const eventDateStr = rsvpDialogEvent.event_date
              ? new Date(rsvpDialogEvent.event_date).toLocaleString("he-IL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
              : "";

            const exportRegistrationsCsv = () => {
              const headers = [
                "שם האירוע", "תאריך האירוע", "מיקום", "מחיר האירוע",
                "שם מלא", "מייל", "טלפון", "אישור הגעה", "סטטוס תשלום", "תאריך הרשמה", "סכום ששולם", "מספר עסקה",
              ];
              const rows = filteredRegs.map(r => [
                rsvpDialogEvent.title,
                eventDateStr,
                rsvpDialogEvent.location || "",
                rsvpDialogEvent.price != null ? rsvpDialogEvent.price : "",
                `${r.first_name} ${r.last_name}`,
                r.email,
                r.phone,
                r.attendance_confirmed ? "כן" : "לא",
                PAYMENT_LABELS[r.payment_status] || r.payment_status,
                new Date(r.created_at).toLocaleString("he-IL"),
                r.amount_paid != null ? r.amount_paid : "",
                r.transaction_ref || "",
              ]);
              csvDownload(headers, rows, `הרשמות_${rsvpDialogEvent.title.replace(/\s+/g, "_")}.csv`);
            };

            const exportRemovalsCsv = () => {
              const removals = removalsData[rsvpDialogEvent.id] || [];
              const headers = ["שם האירוע", "שם המשתתף", "מייל", "טלפון", "סיבת הסרה", "סטטוס תשלום", "תאריך הסרה"];
              const rows = removals.map((r: any) => [
                r.event_title,
                r.participant_name,
                r.email || "",
                r.phone || "",
                r.reason,
                r.payment_status ? (PAYMENT_LABELS[r.payment_status] || r.payment_status) : "",
                new Date(r.removed_at).toLocaleString("he-IL"),
              ]);
              csvDownload(headers, rows, `הוסרו_${rsvpDialogEvent.title.replace(/\s+/g, "_")}.csv`);
            };

            const exportCsv = () => {
              const headers = ["שם", "מקצוע", "סטטוס", "תאריך אישור", ...(hasPayment ? ["סטטוס תשלום"] : [])];
              const rows = allRsvps.map(r => [
                r.full_name,
                r.profession,
                r.status === "attending" ? "מגיע/ה" : "לא מגיע/ה",
                new Date(r.confirmed_at).toLocaleString("he-IL"),
                ...(hasPayment ? [r.payment_status === "paid" ? "שולם" : "לא שולם"] : []),
              ]);
              const bom = "\uFEFF";
              const csv = bom + [headers, ...rows].map(r => r.join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `נרשמים_${rsvpDialogEvent.title.replace(/\s+/g, "_")}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            };

            const formatDate = (d: string) => {
              const date = new Date(d);
              return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" }) + " " + date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
            };

            return (
              <div className="space-y-4 mt-2">
                {/* Summary + Export */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-center flex-1">
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
                </div>
                <Button variant="outline" size="sm" onClick={exportCsv} className="w-full font-body border-border text-foreground">
                  <Download className="h-4 w-4 ml-1" />
                  ייצוא CSV
                </Button>

                {/* Form registrations (guests + members) */}
                {allRegs.length > 0 && (
                  <div className="rounded-lg border border-gold/20 bg-secondary/30 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-body text-sm font-semibold text-foreground flex items-center gap-1">
                        <Users className="h-4 w-4 text-gold" /> נרשמים בטופס ({filteredRegs.length}/{allRegs.length})
                      </h4>
                      <div className="flex items-center gap-2">
                        <Select value={regFilter} onValueChange={setRegFilter}>
                          <SelectTrigger className="bg-background font-body h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">הכל</SelectItem>
                            <SelectItem value="paid">שילמו</SelectItem>
                            <SelectItem value="unpaid">לא שילמו</SelectItem>
                            <SelectItem value="confirmed">אישרו הגעה</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={exportRegistrationsCsv} className="h-8 font-body border-border text-foreground text-xs">
                          <Download className="h-3.5 w-3.5 ml-1" /> ייצוא
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {filteredRegs.map((r) => (
                        <div key={r.id} className="rounded-md border border-border bg-card p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-body text-sm font-medium text-foreground">{r.first_name} {r.last_name}</p>
                            <div className="flex items-center gap-1">
                            <button
                              onClick={() => setRemoveTarget({ type: "registration", name: `${r.first_name} ${r.last_name}`, data: r, event: rsvpDialogEvent })}
                              className="rounded-full p-1 text-destructive hover:bg-destructive/10 transition-colors"
                              title="הסרת משתתף"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleRegPayment(r)}
                              className={cn(
                                "flex items-center gap-1 rounded-full px-2.5 py-1 font-body text-xs transition-colors cursor-pointer",
                                r.payment_status === "paid" && "bg-primary/10 text-primary",
                                r.payment_status === "pending" && "bg-gold/10 text-gold",
                                (r.payment_status === "unpaid" || r.payment_status === "not_required") && "bg-destructive/10 text-destructive",
                              )}
                              title="לחיצה לשינוי סטטוס תשלום"
                            >
                              <CreditCard className="h-3 w-3" />
                              {PAYMENT_LABELS[r.payment_status] || r.payment_status}
                            </button>
                            </div>
                          </div>
                          <p className="font-body text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>{r.email} · {r.phone}</p>
                          <div className="flex items-center gap-2 flex-wrap font-body text-[10px] text-muted-foreground/70">
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {new Date(r.created_at).toLocaleString("he-IL")}
                            </span>
                            <span>{r.attendance_confirmed ? "✓ אישר/ה הגעה" : "✗ לא אישר/ה הגעה"}</span>
                            {r.amount_paid != null && <span>שולם: ₪{Number(r.amount_paid).toLocaleString()}</span>}
                            {r.transaction_ref && <span dir="ltr">אסמכתא: {r.transaction_ref}</span>}
                          </div>
                        </div>
                      ))}
                      {filteredRegs.length === 0 && (
                        <p className="font-body text-xs text-muted-foreground text-center py-2">אין נרשמים בסינון הנוכחי</p>
                      )}
                    </div>
                  </div>
                )}

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
                            <p className="font-body text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {formatDate(r.confirmed_at)}
                            </p>
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
                            <button
                              onClick={() => setRemoveTarget({ type: "rsvp", name: r.full_name, data: r, event: rsvpDialogEvent })}
                              className="rounded-full p-1 text-destructive hover:bg-destructive/10 transition-colors"
                              title="הסרת משתתף"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Removed participants log */}
                {(removalsData[rsvpDialogEvent.id] || []).length > 0 && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-body text-sm font-semibold text-foreground flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-destructive" /> משתתפים שהוסרו ({(removalsData[rsvpDialogEvent.id] || []).length})
                      </h4>
                      <Button variant="outline" size="sm" onClick={exportRemovalsCsv} className="h-7 font-body border-border text-foreground text-xs">
                        <Download className="h-3 w-3 ml-1" /> ייצוא
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {(removalsData[rsvpDialogEvent.id] || []).map((rem: any) => (
                        <div key={rem.id} className="rounded-md border border-border bg-card p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-body text-sm font-medium text-foreground">{rem.participant_name}</p>
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-body text-xs text-destructive">{rem.reason}</span>
                          </div>
                          <p className="font-body text-[10px] text-muted-foreground/70 mt-0.5">
                            {rem.email && <span dir="ltr">{rem.email} · </span>}
                            הוסר ב-{new Date(rem.removed_at).toLocaleString("he-IL")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                            <p className="font-body text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {formatDate(r.confirmed_at)}
                            </p>
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

      {/* Remove participant confirmation */}
      <Dialog open={!!removeTarget} onOpenChange={(open) => { if (!open) { setRemoveTarget(null); setConfirmName(""); setRemoveNote(""); } }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-destructive">הסרת משתתף</DialogTitle>
            <DialogDescription className="font-body text-sm">
              פעולה זו תסיר את <span className="font-bold text-foreground">{removeTarget?.name}</span> מהאירוע
              "{removeTarget?.event?.title}" ותתועד ביומן ההסרות.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">סיבת ההסרה</label>
              <Select value={removeReason} onValueChange={setRemoveReason}>
                <SelectTrigger className="bg-background font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="לא שילם">לא שילם</SelectItem>
                  <SelectItem value="הבריז">הבריז / לא הגיע</SelectItem>
                  <SelectItem value="סיבה אישית">לא יכול מסיבה אישית</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {removeReason === "אחר" && (
              <Input
                placeholder="פרט את הסיבה"
                value={removeNote}
                onChange={(e) => setRemoveNote(e.target.value)}
                className="bg-background font-body"
              />
            )}
            <div>
              <label className="font-body text-xs text-muted-foreground mb-1 block">
                לאישור המחיקה, הקלד את שם המשתתף: <span className="font-bold text-foreground">{removeTarget?.name}</span>
              </label>
              <Input
                placeholder="הקלד את השם במדויק"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="bg-background font-body"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRemoveParticipant}
                disabled={confirmName.trim() !== (removeTarget?.name || "").trim()}
                variant="destructive"
                className="flex-1 font-body"
              >
                <Trash2 className="h-4 w-4 ml-1" /> הסר משתתף
              </Button>
              <Button variant="ghost" onClick={() => { setRemoveTarget(null); setConfirmName(""); setRemoveNote(""); }} className="font-body text-muted-foreground">
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEvents;
