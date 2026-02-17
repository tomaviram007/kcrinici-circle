import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Quote, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const AdminQuotes = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ text: "", author: "", author_title: "" });
  const [adding, setAdding] = useState(false);

  const fetchQuotes = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchQuotes(); }, []);

  const handleAdd = async () => {
    if (!form.text.trim() || !form.author.trim()) return;
    const { error } = await supabase.from("quotes").insert({
      text: form.text.trim(),
      author: form.author.trim(),
      author_title: form.author_title.trim(),
    });
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ציטוט נוסף!" });
    setForm({ text: "", author: "", author_title: "" });
    setAdding(false);
    fetchQuotes();
  };

  const handleUpdate = async () => {
    if (!editId || !form.text.trim()) return;
    const { error } = await supabase.from("quotes").update({
      text: form.text.trim(),
      author: form.author.trim(),
      author_title: form.author_title.trim(),
    }).eq("id", editId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "עודכן!" });
    setEditId(null);
    setForm({ text: "", author: "", author_title: "" });
    fetchQuotes();
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await supabase.from("quotes").update({ is_active: !current }).eq("id", id);
    fetchQuotes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("quotes").delete().eq("id", id);
    toast({ title: "ציטוט נמחק" });
    fetchQuotes();
  };

  const startEdit = (q: any) => {
    setEditId(q.id);
    setForm({ text: q.text, author: q.author, author_title: q.author_title });
    setAdding(false);
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Quote className="h-5 w-5 text-gold" /> ניהול ציטוטים ({quotes.length})
        </h3>
        <Button size="sm" onClick={() => { setAdding(true); setEditId(null); setForm({ text: "", author: "", author_title: "" }); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> הוסף ציטוט
        </Button>
      </div>

      {/* Add/Edit form */}
      {(adding || editId) && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <p className="font-body text-sm font-medium text-gold">{editId ? "עריכת ציטוט" : "ציטוט חדש"}</p>
          <Input placeholder="טקסט הציטוט" value={form.text} onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))} className="bg-background" autoComplete="off" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="שם המצטט" value={form.author} onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))} className="bg-background" autoComplete="off" />
            <Input placeholder="תיאור (למשל: יזם, סופר)" value={form.author_title} onChange={(e) => setForm(f => ({ ...f, author_title: e.target.value }))} className="bg-background" autoComplete="off" />
          </div>
          <div className="flex gap-2">
            <Button onClick={editId ? handleUpdate : handleAdd} className="gradient-gold text-primary-foreground font-body" disabled={!form.text.trim()}>
              <Check className="h-4 w-4 ml-1" /> {editId ? "עדכן" : "הוסף"}
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setEditId(null); setForm({ text: "", author: "", author_title: "" }); }} className="font-body">
              <X className="h-4 w-4 ml-1" /> ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Quotes list */}
      <div className="space-y-3">
        {quotes.map((q) => (
          <div key={q.id} className={`rounded-lg border bg-card p-4 flex items-start justify-between gap-4 ${q.is_active ? "border-gold/20" : "border-border opacity-60"}`}>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-sm font-bold text-foreground leading-relaxed">"{q.text}"</p>
              <p className="mt-1 font-body text-xs text-gold">{q.author} — {q.author_title}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={q.is_active} onCheckedChange={() => handleToggleActive(q.id, q.is_active)} />
              <Button size="icon" variant="ghost" onClick={() => startEdit(q)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminQuotes;
