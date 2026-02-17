import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const TAPE_COLORS = [
  "bg-gold/80",
  "bg-gold/60",
  "bg-amber-700/50",
  "bg-gold/70",
  "bg-amber-600/40",
];

const ROTATIONS = [
  "-rotate-2",
  "rotate-1",
  "-rotate-1",
  "rotate-2",
  "rotate-0",
  "-rotate-3",
  "rotate-3",
];

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
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      {/* Header Section */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-serif text-5xl font-bold text-gold/30 md:text-6xl">01</span>
            <span className="font-body text-sm tracking-widest text-gold uppercase">עדכונים</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            לוח מודעות
          </h1>
          <p className="mt-3 font-body text-sm text-muted-foreground max-w-md leading-relaxed">
            המודעות שלנו נועד לתת לכם את המידע באופן רציף והכי עדכני שאפשר שלא תפספסו שום עדכון
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", content: "" }); }}
          className="gradient-gold text-primary-foreground font-body"
        >
          <Plus className="h-4 w-4 ml-1" /> פרסם מודעה
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת המודעה" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תוכן המודעה" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className="bg-background min-h-[100px]" />
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "פרסם"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ title: "", content: "" }); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      {/* Sticky Notes Grid */}
      {items.length === 0 ? (
        <p className="font-body text-muted-foreground text-center py-12">אין מודעות כרגע.</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`group relative ${ROTATIONS[i % ROTATIONS.length]} hover:rotate-0 transition-transform duration-300`}
            >
              {/* Tape */}
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 ${TAPE_COLORS[i % TAPE_COLORS.length]} rounded-sm z-10 shadow-sm`} />
              
              {/* Note Card */}
              <div className="relative bg-[#fdf6e3] dark:bg-[#f5f0dc] rounded shadow-lg p-5 pt-6 min-h-[180px] flex flex-col border border-amber-200/30">
                {/* Lined paper effect */}
                <div className="absolute inset-x-5 top-6 bottom-5 pointer-events-none">
                  {[...Array(8)].map((_, lineIdx) => (
                    <div
                      key={lineIdx}
                      className="border-b border-blue-200/30"
                      style={{ height: "22px" }}
                    />
                  ))}
                </div>

                {/* Content */}
                <div className="relative z-[1] flex-1">
                  <h3 className="font-serif text-lg font-bold text-gray-800 mb-2 leading-tight">
                    {item.title}
                  </h3>
                  <p className="font-body text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {item.content}
                  </p>
                </div>

                {/* Footer */}
                <div className="relative z-[1] mt-3 flex items-center justify-between">
                  <span className="font-body text-[11px] text-gray-400">
                    {new Date(item.created_at).toLocaleDateString("he-IL")}
                  </span>
                  {canModify(item) && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(item)} className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700 hover:bg-amber-100">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
