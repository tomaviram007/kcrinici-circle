import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";

const AdminEvents = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", event_date: "", location: "" });

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(data || []);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await supabase.from("events").update(form).eq("id", editId);
      toast({ title: "עודכן!" });
    } else {
      await supabase.from("events").insert(form);
      toast({ title: "נוסף!" });
    }
    setForm({ title: "", description: "", event_date: "", location: "" });
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
    setForm({ title: event.title, description: event.description, event_date: event.event_date?.slice(0, 16) || "", location: event.location || "" });
    setEditId(event.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground">ניהול אירועים</h3>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", description: "", event_date: "", location: "" }); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> הוסף
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת האירוע" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תיאור" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-background" />
          <div className="grid grid-cols-2 gap-3">
            <Input type="datetime-local" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required className="bg-background" dir="ltr" />
            <Input placeholder="מיקום" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-background" />
          </div>
          <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "הוסף"}</Button>
        </form>
      )}

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <h4 className="font-serif text-base font-bold text-foreground">{event.title}</h4>
              <p className="font-body text-sm text-muted-foreground">{event.description}</p>
              <p className="mt-1 font-body text-xs text-gold">
                {event.event_date && new Date(event.event_date).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                {event.location && ` · ${event.location}`}
              </p>
            </div>
            <div className="flex gap-1 shrink-0 mr-3">
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
