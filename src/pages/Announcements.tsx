import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Announcements = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    fetchItems();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (editId) {
      const { error } = await supabase.from("announcements").update(form).eq("id", editId);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "עודכן בהצלחה!" });
    } else {
      const { error } = await supabase.from("announcements").insert({ ...form, created_by: userId });
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "מודעה פורסמה!" });
    }
    setForm({ title: "", content: "" });
    setShowForm(false);
    setEditId(null);
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "נמחק" });
    fetchItems();
  };

  const startEdit = (item: any) => {
    setForm({ title: item.title, content: item.content });
    setEditId(item.id);
    setShowForm(true);
  };

  const canModify = (item: any) => item.created_by === userId;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            לוח <span className="text-gold">המודעות</span>
          </h1>
          <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", content: "" }); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> פרסם מודעה
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת המודעה" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תוכן המודעה" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className="bg-background min-h-[100px]" />
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "פרסם"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ title: "", content: "" }); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="font-body text-muted-foreground">אין מודעות כרגע.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-6 transition-all hover:border-gold/20 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.05)]" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Megaphone className="h-5 w-5 text-gold" />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 font-body text-base leading-relaxed text-muted-foreground whitespace-pre-line">{item.content}</p>
                  <p className="mt-3 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
                </div>
                {canModify(item) && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
