import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, Megaphone, Calendar } from "lucide-react";

type Banner = {
  id: string;
  title: string;
  body: string | null;
  emoji: string | null;
  button_text: string | null;
  button_url: string | null;
  days_of_week: number[] | null;
  start_date: string | null;
  end_date: string | null;
  target_page: string;
  is_active: boolean;
  display_order: number;
};

const DAYS = [
  { v: 0, label: "א'" },
  { v: 1, label: "ב'" },
  { v: 2, label: "ג'" },
  { v: 3, label: "ד'" },
  { v: 4, label: "ה'" },
  { v: 5, label: "ו'" },
  { v: 6, label: "ש'" },
];

const PAGES = [
  { v: "announcements", label: "לוח מודעות" },
  { v: "home", label: "דף הבית" },
];

const emptyBanner = (): Partial<Banner> => ({
  title: "",
  body: "",
  emoji: "📢",
  button_text: "",
  button_url: "",
  days_of_week: null,
  target_page: "announcements",
  is_active: true,
  display_order: 0,
});

export default function AdminPromoBanners() {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_banners")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) toast({ title: "שגיאה בטעינה", description: error.message, variant: "destructive" });
    else setBanners((data ?? []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title?.trim()) {
      toast({ title: "חסר כותרת", variant: "destructive" });
      return;
    }
    const payload: any = {
      title: editing.title?.trim(),
      body: editing.body?.trim() || null,
      emoji: editing.emoji?.trim() || null,
      button_text: editing.button_text?.trim() || null,
      button_url: editing.button_url?.trim() || null,
      days_of_week: editing.days_of_week && editing.days_of_week.length ? editing.days_of_week : null,
      target_page: editing.target_page || "announcements",
      is_active: editing.is_active ?? true,
      display_order: editing.display_order ?? 0,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("promo_banners").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("promo_banners").insert(payload));
    }
    if (error) {
      toast({ title: "שגיאה בשמירה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "נשמר בהצלחה" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הבאנר?")) return;
    const { error } = await supabase.from("promo_banners").delete().eq("id", id);
    if (error) toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
    else { toast({ title: "נמחק" }); load(); }
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await supabase.from("promo_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else load();
  };

  const toggleDay = (d: number) => {
    if (!editing) return;
    const current = editing.days_of_week ?? [];
    const next = current.includes(d) ? current.filter(x => x !== d) : [...current, d].sort();
    setEditing({ ...editing, days_of_week: next });
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-gold" />
            ניהול באנרים
          </h2>
          <p className="font-body text-sm text-muted-foreground mt-1">
            הודעות באנר בעמוד המודעות (למשל "יום שלישי – יום פרסומים").
          </p>
        </div>
        <Button onClick={() => setEditing(emptyBanner())} className="gap-1.5">
          <Plus className="h-4 w-4" /> באנר חדש
        </Button>
      </div>

      {loading && <p className="text-muted-foreground font-body">טוען...</p>}

      <div className="grid gap-3">
        {banners.map(b => (
          <Card key={b.id} className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {b.emoji && <span>{b.emoji}</span>}
                <h3 className="font-serif font-bold text-foreground">{b.title}</h3>
                {!b.is_active && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">כבוי</span>
                )}
                {b.days_of_week?.length ? (
                  <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {b.days_of_week.map(d => DAYS[d]?.label).join(", ")}
                  </span>
                ) : null}
                <span className="text-xs bg-muted/50 text-muted-foreground px-2 py-0.5 rounded">
                  {PAGES.find(p => p.v === b.target_page)?.label || b.target_page}
                </span>
              </div>
              {b.body && <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-2">{b.body}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
              <Button size="icon" variant="ghost" onClick={() => setEditing(b)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {!loading && banners.length === 0 && (
          <p className="font-body text-muted-foreground text-center py-8">אין באנרים עדיין.</p>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <Card className="relative w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <button
              onClick={() => setEditing(null)}
              className="absolute left-3 top-3 p-1 rounded-full hover:bg-muted"
              aria-label="סגור"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-serif text-xl font-bold mb-4">{editing.id ? "עריכת באנר" : "באנר חדש"}</h3>
            <div className="space-y-4">
              <div>
                <Label>כותרת *</Label>
                <Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} dir="rtl" />
              </div>
              <div>
                <Label>טקסט</Label>
                <Textarea value={editing.body || ""} onChange={e => setEditing({ ...editing, body: e.target.value })} dir="rtl" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>אימוג'י</Label>
                  <Input value={editing.emoji || ""} onChange={e => setEditing({ ...editing, emoji: e.target.value })} placeholder="📢" />
                </div>
                <div>
                  <Label>סדר תצוגה</Label>
                  <Input type="number" value={editing.display_order ?? 0} onChange={e => setEditing({ ...editing, display_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>טקסט כפתור</Label>
                  <Input value={editing.button_text || ""} onChange={e => setEditing({ ...editing, button_text: e.target.value })} dir="rtl" placeholder="לקבוצה" />
                </div>
                <div>
                  <Label>קישור כפתור</Label>
                  <Input value={editing.button_url || ""} onChange={e => setEditing({ ...editing, button_url: e.target.value })} dir="ltr" placeholder="https://" />
                </div>
              </div>
              <div>
                <Label>עמוד יעד</Label>
                <select
                  value={editing.target_page || "announcements"}
                  onChange={e => setEditing({ ...editing, target_page: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {PAGES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <Label className="mb-2 block">ימים בשבוע (ריק = כל יום)</Label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => {
                    const active = editing.days_of_week?.includes(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => toggleDay(d.v)}
                        className={`w-10 h-10 rounded-full border font-bold text-sm transition ${
                          active ? "bg-gold text-background border-gold" : "bg-background border-border text-foreground hover:bg-muted"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/30">
                <Label htmlFor="active-switch">פעיל</Label>
                <Switch
                  id="active-switch"
                  checked={editing.is_active ?? true}
                  onCheckedChange={v => setEditing({ ...editing, is_active: v })}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>ביטול</Button>
                <Button onClick={save}>שמור</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
