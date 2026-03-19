import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import { Trash2, Check, Clock, Plus, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fireConfetti } from "@/lib/confetti";

const AdminAnnouncements = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "announcement" });

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "שגיאה", description: "יש למלא כותרת ותוכן", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("announcements").insert({
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      is_approved: true,
    });
    setSubmitting(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "פורסם!", description: "המודעה פורסמה בהצלחה." });
    fireConfetti();
    setForm({ title: "", content: "", category: "announcement" });
    setShowForm(false);
    fetchItems();
  };

  const handleApprove = async (id: string) => {
    await supabase.from("announcements").update({ is_approved: true }).eq("id", id);
    toast({ title: "המודעה אושרה!" });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "נמחק" });
    fetchItems();
  };

  const pending = items.filter((i) => !i.is_approved);
  const approved = items.filter((i) => i.is_approved);

  return (
    <div className="space-y-8">
      {/* Create button / form */}
      <div>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="gradient-gold text-primary-foreground font-body">
            <Plus className="h-4 w-4 ml-1" /> פרסם מודעה חדשה
          </Button>
        ) : (
          <div className="rounded-lg border border-gold/30 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">מודעה חדשה</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <Input
              placeholder="כותרת המודעה"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="font-body"
              dir="rtl"
            />
            <Textarea
              placeholder="תוכן המודעה"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="font-body min-h-[100px]"
              dir="rtl"
            />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="font-body w-48">
                <SelectValue placeholder="סוג מודעה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">הודעה</SelectItem>
                <SelectItem value="sale">מכירה</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleCreate} disabled={submitting} className="gradient-gold text-primary-foreground font-body">
              {submitting ? "מפרסם..." : "פרסם מודעה"}
            </Button>
          </div>
        )}
      </div>

      {/* Pending */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" /> ממתינות לאישור ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין מודעות ממתינות.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <div key={item.id} className="flex items-start justify-between rounded-lg border border-gold/20 bg-card p-4">
                <div>
                  <h4 className="font-serif text-base font-bold text-foreground">{item.title}</h4>
                  <p className="font-body text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                  <p className="mt-1 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
                </div>
                <div className="flex gap-1 shrink-0 mr-3">
                  <Button size="sm" onClick={() => handleApprove(item.id)} className="gradient-gold text-primary-foreground font-body">
                    <Check className="h-3.5 w-3.5 ml-1" /> אשר
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" /> מודעות מאושרות ({approved.length})
        </h3>
        <div className="space-y-3">
          {approved.map((item) => (
            <div key={item.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <h4 className="font-serif text-base font-bold text-foreground">{item.title}</h4>
                <p className="font-body text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
              </div>
              <div className="flex gap-1 shrink-0 mr-3">
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
