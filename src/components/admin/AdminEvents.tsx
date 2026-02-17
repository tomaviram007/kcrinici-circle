import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, CalendarIcon, ImageIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

const EMPTY_FORM = { title: "", description: "", event_date: "", location: "", image_url: "" };

const AdminEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `events/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
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
    const payload = { ...form, image_url: form.image_url || null };
    if (editId) {
      await supabase.from("events").update(payload).eq("id", editId);
      toast({ title: "עודכן!" });
    } else {
      await supabase.from("events").insert(payload);
      toast({ title: "נוסף!" });
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
                placeholder="הכנס קישור לתמונה"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                className="bg-background flex-1"
                dir="ltr"
              />
              <label className="cursor-pointer">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" disabled={uploading} className="h-10 border-border" asChild>
                  <span>{uploading ? "מעלה..." : "העלה"}</span>
                </Button>
              </label>
            </div>
            {form.image_url && (
              <div className="relative w-32 h-20 rounded-md overflow-hidden border border-border">
                <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
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
        {events.map((event) => (
          <div key={event.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4 gap-3">
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
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => startEdit(event)}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminEvents;
