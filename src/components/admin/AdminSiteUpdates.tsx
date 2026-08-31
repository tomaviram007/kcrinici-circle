import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Sparkles, ArrowLeft, Megaphone } from "lucide-react";

interface SiteUpdate {
  id: string;
  badge_text: string;
  title: string;
  body: string | null;
  image_url: string | null;
  button_text: string;
  button_url: string;
  audience: string;
  max_displays: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  display_order: number;
  created_at: string;
}

const SITE_PAGES = [
  { v: "/realestate", label: "נדל״ן בשכונה" },
  { v: "/secondhand", label: "יד שנייה" },
  { v: "/deals", label: "הטבות" },
  { v: "/jobs", label: "דרושים" },
  { v: "/events", label: "לוח אירועים" },
  { v: "/recommendations", label: "אנשי מקצוע" },
  { v: "/gallery", label: "גלריה" },
  { v: "/announcements", label: "לוח מודעות" },
  { v: "/members", label: "חברי המועדון" },
];

const AUDIENCES = [
  { v: "all", label: "כולם" },
  { v: "members", label: "רק חברים מאושרים" },
  { v: "guests", label: "רק מי שעוד לא חבר" },
];

const audienceLabel = (v: string) => AUDIENCES.find(a => a.v === v)?.label || v;

const emptyForm = {
  badge_text: "חדש באתר",
  title: "",
  body: "",
  image_url: "",
  button_text: "לצפייה",
  button_url: "/realestate",
  audience: "all",
  max_displays: "2",
  is_active: true,
  ends_at: "",
};

const AdminSiteUpdates = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<SiteUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("site_updates")
      .select("*")
      .order("display_order", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data as SiteUpdate[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (u: SiteUpdate) => {
    setEditId(u.id);
    setForm({
      badge_text: u.badge_text,
      title: u.title,
      body: u.body || "",
      image_url: u.image_url || "",
      button_text: u.button_text,
      button_url: u.button_url,
      audience: u.audience,
      max_displays: String(u.max_displays),
      is_active: u.is_active,
      ends_at: u.ends_at ? u.ends_at.slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.button_url.trim()) {
      toast({ title: "צריך כותרת ויעד לכפתור", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      badge_text: form.badge_text.trim() || "חדש באתר",
      title: form.title.trim(),
      body: form.body.trim() || null,
      image_url: form.image_url.trim() || null,
      button_text: form.button_text.trim() || "לצפייה",
      button_url: form.button_url.trim(),
      audience: form.audience,
      max_displays: parseInt(form.max_displays, 10) || 2,
      is_active: form.is_active,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    const { error } = editId
      ? await (supabase as any).from("site_updates").update(payload).eq("id", editId)
      : await (supabase as any).from("site_updates").insert(payload);

    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else {
      toast({ title: editId ? "העדכון נשמר" : "העדכון נוצר ויקפוץ בדף הבית" });
      setDialogOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  const toggleActive = async (u: SiteUpdate) => {
    const { error } = await (supabase as any).from("site_updates").update({ is_active: !u.is_active }).eq("id", u.id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את העדכון?")) return;
    const { error } = await (supabase as any).from("site_updates").delete().eq("id", id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else { toast({ title: "נמחק" }); fetchAll(); }
  };

  if (loading) return <p className="font-body text-muted-foreground">טוען...</p>;

  return (
    <div dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-serif text-xl font-bold text-foreground">
            <Megaphone className="h-5 w-5 text-gold" />
            עדכוני אתר ({items.length})
          </h3>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            פופאפ שקופץ בדף הבית ומספר על עמוד, שירות או מוצר חדש. כל מבקר רואה אותו מספר פעמים מוגבל.
          </p>
        </div>
        <Button onClick={openNew} className="gradient-gold font-body text-primary-foreground">
          <Plus className="ml-1 h-4 w-4" /> עדכון חדש
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">אין עדכונים. כשתפתח עמוד או שירות חדש, צור כאן עדכון והוא יקפוץ למבקרים בדף הבית.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(u => (
            <div key={u.id} className={`rounded-xl border bg-card p-3 ${u.is_active ? "border-gold/40" : "border-border"}`}>
              <div className="flex gap-3">
                {u.image_url && (
                  <img src={u.image_url} alt={u.title} className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="truncate font-serif font-bold text-foreground">{u.title}</h4>
                    <Switch checked={u.is_active} onCheckedChange={() => toggleActive(u)} />
                  </div>
                  <p className="line-clamp-2 font-body text-xs text-muted-foreground">{u.body || "—"}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{u.badge_text}</Badge>
                    <Badge variant="outline" className="text-[10px]">{audienceLabel(u.audience)}</Badge>
                    <Badge variant="outline" className="text-[10px]">עד {u.max_displays} הצגות</Badge>
                    <Badge variant="outline" className="text-[10px]" dir="ltr">{u.button_url}</Badge>
                    {!u.is_active && <Badge variant="secondary" className="text-[10px]">כבוי</Badge>}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(u)}>
                      <Pencil className="ml-1 h-3 w-3" />עריכה
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove(u.id)}>
                      <Trash2 className="ml-1 h-3 w-3" />מחק
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[92vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="font-serif text-lg">{editId ? "עריכת עדכון" : "עדכון חדש"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">תגית קטנה</Label>
                  <Input value={form.badge_text} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} className="h-10 bg-background" placeholder="חדש באתר" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">למי מציגים</Label>
                  <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map(a => <SelectItem key={a.v} value={a.v}>{a.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-muted-foreground">כותרת *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 bg-background" placeholder="פתחנו לוח נדל״ן בשכונה" />
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-muted-foreground">טקסט</Label>
                <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="resize-none bg-background" rows={3} placeholder="דירות להשכרה ולמכירה ישירות מהשכנים, בלי תיווך. אפשר לפרסם מודעה חינם." />
              </div>

              <div className="space-y-1.5">
                <Label className="font-body text-xs text-muted-foreground">קישור לתמונה</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="h-10 bg-background" dir="ltr" placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">טקסט הכפתור</Label>
                  <Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="h-10 bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">לאן הכפתור מוביל *</Label>
                  <Select value={SITE_PAGES.some(p => p.v === form.button_url) ? form.button_url : "custom"} onValueChange={(v) => setForm({ ...form, button_url: v === "custom" ? "" : v })}>
                    <SelectTrigger className="h-10 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SITE_PAGES.map(p => <SelectItem key={p.v} value={p.v}>{p.label}</SelectItem>)}
                      <SelectItem value="custom">כתובת אחרת</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!SITE_PAGES.some(p => p.v === form.button_url) && (
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">כתובת</Label>
                  <Input value={form.button_url} onChange={(e) => setForm({ ...form, button_url: e.target.value })} className="h-10 bg-background" dir="ltr" placeholder="/realestate" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">כמה פעמים להציג</Label>
                  <Input type="number" min="1" max="10" value={form.max_displays} onChange={(e) => setForm({ ...form, max_displays: e.target.value })} className="h-10 bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-body text-xs text-muted-foreground">להפסיק בתאריך</Label>
                  <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="h-10 bg-background" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                <Label className="font-body text-xs">פעיל</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>

            {/* Live preview of the popup itself */}
            <div className="space-y-2">
              <Label className="font-body text-xs text-muted-foreground">כך זה ייראה בדף הבית</Label>
              <div className="overflow-hidden rounded-xl border border-gold/40 bg-background">
                {form.image_url && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
                    <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  </div>
                )}
                <div className={`px-5 pb-5 ${form.image_url ? "relative -mt-6" : "pt-6"}`}>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-body text-[11px] font-bold text-gold">
                    <Sparkles className="h-3 w-3" />
                    {form.badge_text || "חדש באתר"}
                  </span>
                  <h2 className="mt-3 font-serif text-xl font-bold leading-tight text-foreground">
                    {form.title || "כותרת העדכון"}
                  </h2>
                  {form.body && (
                    <p className="mt-2 whitespace-pre-line font-body text-sm leading-relaxed text-muted-foreground">{form.body}</p>
                  )}
                  <div className="mt-4">
                    <div className="gradient-gold flex h-10 w-full items-center justify-center rounded-md font-body text-sm text-primary-foreground">
                      {form.button_text || "לצפייה"}
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                    </div>
                    <p className="mt-2 text-center font-body text-xs text-muted-foreground">אולי בפעם הבאה</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <Button onClick={save} disabled={saving} className="gradient-gold h-11 flex-1 font-body text-primary-foreground">
              {saving ? "שומר..." : editId ? "שמירת שינויים" : "יצירת העדכון"}
            </Button>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="h-11 font-body">ביטול</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSiteUpdates;
