import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Quote, Check, X, Upload, Loader2, Link as LinkIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const PAGE_OPTIONS = [
  { value: "home", label: "דף הבית" },
  { value: "announcements", label: "לוח מודעות" },
  { value: "jobs", label: "דרושים" },
  { value: "members", label: "חברי המועדון" },
  { value: "events", label: "לוח אירועים" },
  { value: "gallery", label: "גלריה" },
];

const AdminQuotes = () => {
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    text: "", author: "", author_title: "",
    background_image_url: "", section_height: 28, font_size: 24, page_location: "home",
  });
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bgMode, setBgMode] = useState<"url" | "file">("url");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchQuotes = async () => {
    const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    setQuotes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchQuotes(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "שגיאה", description: "יש להעלות קובץ תמונה בלבד", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `quote-bg-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      setForm(f => ({ ...f, background_image_url: urlData.publicUrl }));
      toast({ title: "התמונה הועלתה!" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.text.trim() || !form.author.trim()) return;
    const { error } = await supabase.from("quotes").insert({
      text: form.text.trim(),
      author: form.author.trim(),
      author_title: form.author_title.trim(),
      background_image_url: form.background_image_url || null,
      section_height: form.section_height,
      font_size: form.font_size,
      page_location: form.page_location,
    });
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "ציטוט נוסף!" });
    resetForm();
    fetchQuotes();
  };

  const handleUpdate = async () => {
    if (!editId || !form.text.trim()) return;
    const { error } = await supabase.from("quotes").update({
      text: form.text.trim(),
      author: form.author.trim(),
      author_title: form.author_title.trim(),
      background_image_url: form.background_image_url || null,
      section_height: form.section_height,
      font_size: form.font_size,
      page_location: form.page_location,
    }).eq("id", editId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "עודכן!" });
    resetForm();
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
    setForm({
      text: q.text, author: q.author, author_title: q.author_title || "",
      background_image_url: q.background_image_url || "",
      section_height: q.section_height || 28,
      font_size: q.font_size || 24,
      page_location: q.page_location || "home",
    });
    setAdding(false);
  };

  const resetForm = () => {
    setAdding(false);
    setEditId(null);
    setForm({ text: "", author: "", author_title: "", background_image_url: "", section_height: 28, font_size: 24, page_location: "home" });
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Quote className="h-5 w-5 text-gold" /> ניהול ציטוטים ({quotes.length})
        </h3>
        <Button size="sm" onClick={() => { setAdding(true); setEditId(null); resetForm(); setAdding(true); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> הוסף ציטוט
        </Button>
      </div>

      {/* Add/Edit form */}
      {(adding || editId) && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <p className="font-body text-sm font-medium text-gold">{editId ? "עריכת ציטוט" : "ציטוט חדש"}</p>

          {/* Text fields */}
          <Input placeholder="טקסט הציטוט" value={form.text} onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))} className="bg-background" autoComplete="off" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="שם המצטט" value={form.author} onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))} className="bg-background" autoComplete="off" />
            <Input placeholder="תיאור (למשל: יזם, סופר)" value={form.author_title} onChange={(e) => setForm(f => ({ ...f, author_title: e.target.value }))} className="bg-background" autoComplete="off" />
          </div>

          {/* Page location */}
          <div className="space-y-2">
            <Label className="font-body text-sm">מיקום בעמוד</Label>
            <Select value={form.page_location} onValueChange={(v) => setForm(f => ({ ...f, page_location: v }))}>
              <SelectTrigger className="bg-background font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Background image */}
          <div className="space-y-2">
            <Label className="font-body text-sm">תמונת רקע</Label>
            <div className="flex gap-2 mb-2">
              <Button type="button" size="sm" variant={bgMode === "url" ? "default" : "outline"} onClick={() => setBgMode("url")} className="font-body text-xs">
                <LinkIcon className="h-3 w-3 ml-1" /> מקישור
              </Button>
              <Button type="button" size="sm" variant={bgMode === "file" ? "default" : "outline"} onClick={() => setBgMode("file")} className="font-body text-xs">
                <Upload className="h-3 w-3 ml-1" /> מהמחשב
              </Button>
            </div>
            {bgMode === "url" ? (
              <Input placeholder="קישור לתמונת רקע (URL)" value={form.background_image_url} onChange={(e) => setForm(f => ({ ...f, background_image_url: e.target.value }))} className="bg-background" autoComplete="off" />
            ) : (
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="font-body">
                  {uploading ? <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> מעלה...</> : <><Upload className="h-4 w-4 ml-1" /> בחר תמונה</>}
                </Button>
                {form.background_image_url && <span className="font-body text-xs text-muted-foreground truncate max-w-[200px]">✓ תמונה נבחרה</span>}
              </div>
            )}
            {form.background_image_url && (
              <div className="mt-2 h-20 rounded-lg overflow-hidden border border-border">
                <img src={form.background_image_url} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Section height */}
          <div className="space-y-2">
            <Label className="font-body text-sm">גובה הסקשן: {form.section_height}vw</Label>
            <Slider value={[form.section_height]} onValueChange={([v]) => setForm(f => ({ ...f, section_height: v }))} min={15} max={60} step={1} />
          </div>

          {/* Font size */}
          <div className="space-y-2">
            <Label className="font-body text-sm">גודל גופן: {form.font_size}px</Label>
            <Slider value={[form.font_size]} onValueChange={([v]) => setForm(f => ({ ...f, font_size: v }))} min={14} max={48} step={1} />
          </div>

          <div className="flex gap-2">
            <Button onClick={editId ? handleUpdate : handleAdd} className="gradient-gold text-primary-foreground font-body" disabled={!form.text.trim()}>
              <Check className="h-4 w-4 ml-1" /> {editId ? "עדכן" : "הוסף"}
            </Button>
            <Button variant="ghost" onClick={resetForm} className="font-body">
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
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="font-body text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {PAGE_OPTIONS.find(p => p.value === q.page_location)?.label || "דף הבית"}
                </span>
                <span className="font-body text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  גובה: {q.section_height || 28}vw
                </span>
                <span className="font-body text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  גופן: {q.font_size || 24}px
                </span>
              </div>
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
