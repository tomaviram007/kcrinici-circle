import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";

const AdminAnnouncements = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await supabase.from("announcements").update(form).eq("id", editId);
      toast({ title: "עודכן!" });
    } else {
      await supabase.from("announcements").insert(form);
      toast({ title: "נוסף!" });
    }
    setForm({ title: "", content: "" });
    setShowForm(false);
    setEditId(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "נמחק" });
    fetchItems();
  };

  const startEdit = (item: any) => {
    setForm({ title: item.title, content: item.content });
    setEditId(item.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground">ניהול מודעות</h3>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", content: "" }); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> הוסף
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תוכן" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className="bg-background min-h-[100px]" />
          <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "הוסף"}</Button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <h4 className="font-serif text-base font-bold text-foreground">{item.title}</h4>
              <p className="font-body text-sm text-muted-foreground line-clamp-3">{item.content}</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
            </div>
            <div className="flex gap-1 shrink-0 mr-3">
              <Button variant="ghost" size="sm" onClick={() => startEdit(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminAnnouncements;
