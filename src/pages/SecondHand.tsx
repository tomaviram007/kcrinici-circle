import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Phone, Tag, Trash2, Pencil, CheckCircle2, X, Package } from "lucide-react";
import PageHero from "@/components/PageHero";
import { usePageCover } from "@/hooks/usePageCover";
import SaleImageUpload from "@/components/announcements/SaleImageUpload";
import heroImg from "@/assets/hero-secondhand.jpg";

const CATEGORIES = ["כללי", "רכב", "אלקטרוניקה", "ריהוט", "ביגוד / אופנה", "ספורט ופנאי", "כלי בית", "נדל״ן", "אחר"];
const CONDITIONS = [
  { value: "new", label: "חדש באריזה" },
  { value: "like_new", label: "כמו חדש" },
  { value: "used_good", label: "משומש — טוב מאוד" },
  { value: "used_fair", label: "משומש — סביר" },
  { value: "needs_repair", label: "דורש תיקון" },
];
const conditionLabel = (v: string) => CONDITIONS.find(c => c.value === v)?.label || v;

interface Item {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  condition: string;
  category: string;
  images: string[];
  contact_phone: string | null;
  is_sold: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  description: "",
  price: "",
  condition: "used_good",
  category: "כללי",
  contact_phone: "",
  images: [] as string[],
};

const SecondHand = () => {
  const { user, isApproved } = useAuth();
  const { toast } = useToast();
  const cover = usePageCover("secondhand", heroImg);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewItem, setViewItem] = useState<Item | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("secondhand_items")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (catFilter !== "all" && it.category !== catFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!it.title.toLowerCase().includes(q) && !(it.description || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, search, catFilter]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (it: Item) => {
    setEditId(it.id);
    setForm({
      title: it.title,
      description: it.description || "",
      price: it.price?.toString() || "",
      condition: it.condition,
      category: it.category,
      contact_phone: it.contact_phone || "",
      images: it.images || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: "נא למלא כותרת", variant: "destructive" });
      return;
    }
    if (!user) return;
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      price: form.price ? parseFloat(form.price) : null,
      condition: form.condition,
      category: form.category,
      contact_phone: form.contact_phone.trim() || null,
      images: form.images,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("secondhand_items").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("secondhand_items").insert({ ...payload, created_by: user.id }));
    }

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "הפריט עודכן" : "הפריט פורסם!" });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את הפריט?")) return;
    const { error } = await supabase.from("secondhand_items").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "הפריט נמחק" });
      fetchItems();
    }
  };

  const toggleSold = async (it: Item) => {
    const { error } = await supabase.from("secondhand_items").update({ is_sold: !it.is_sold }).eq("id", it.id);
    if (!error) fetchItems();
  };

  return (
    <>
      <PageHero
        image={cover}
        title="יד"
        highlight="שנייה"
        subtitle="מכירות והעברה של פריטים בין חברי המועדון"
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12" dir="rtl">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
          <Input
            placeholder="חיפוש פריט..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs bg-card border-border"
          />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="md:max-w-[180px] bg-card border-border">
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="md:mr-auto">
            {user && isApproved ? (
              <Button onClick={openNew} className="gradient-gold text-primary-foreground font-body w-full md:w-auto">
                <Plus className="h-4 w-4 ml-1" />
                פרסום פריט
              </Button>
            ) : (
              <p className="font-body text-xs text-muted-foreground">
                רק חברים מאושרים יכולים לפרסם פריטים
              </p>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">טוען...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-body text-muted-foreground">אין פריטים להצגה כרגע</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(it => {
              const isOwner = user?.id === it.created_by;
              return (
                <article
                  key={it.id}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-gold/40 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)] transition-all cursor-pointer"
                  onClick={() => setViewItem(it)}
                >
                  <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                    {it.images?.[0] ? (
                      <img src={it.images[0]} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {it.is_sold && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <span className="rotate-[-12deg] border-4 border-destructive text-destructive font-serif font-bold text-3xl px-6 py-1 rounded">
                          נמכר
                        </span>
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-background/80 text-foreground border-border backdrop-blur-sm">
                      {it.category}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">{it.title}</h3>
                      {it.price !== null && (
                        <p className="font-serif text-lg font-bold text-gold whitespace-nowrap">
                          ₪{it.price.toLocaleString("he-IL")}
                        </p>
                      )}
                    </div>
                    <p className="font-body text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {it.description || "—"}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="outline" className="font-body text-[10px] border-border/60">
                        <Tag className="h-3 w-3 ml-1" />
                        {conditionLabel(it.condition)}
                      </Badge>
                    </div>
                    {isOwner && (
                      <div className="flex gap-1.5 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => openEdit(it)}>
                          <Pencil className="h-3 w-3 ml-1" /> ערוך
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => toggleSold(it)}>
                          <CheckCircle2 className="h-3 w-3 ml-1" /> {it.is_sold ? "החזר למכירה" : "סמן כנמכר"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDelete(it.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editId ? "עריכת פריט" : "פרסום פריט יד שנייה"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-2">
            {/* Form fields */}
            <div className="space-y-4 lg:col-span-1">
              <div>
                <Label className="font-body text-xs">כותרת *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
              </div>
              <div>
                <Label className="font-body text-xs">תיאור</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={5} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs">מחיר (₪)</Label>
                  <Input type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-background" />
                </div>
                <div>
                  <Label className="font-body text-xs">טלפון ליצירת קשר</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="bg-background" placeholder="0501234567" />
                </div>
                <div>
                  <Label className="font-body text-xs">מצב המוצר</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-body text-xs">קטגוריה</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Images column */}
            <div className="space-y-3">
              <Label className="font-body text-xs">תמונות</Label>
              {user && (
                <SaleImageUpload
                  userId={user.id}
                  mainImage={form.images[0] || null}
                  galleryImages={form.images.slice(1)}
                  onMainImageChange={(url) => {
                    const rest = form.images.slice(1);
                    setForm({ ...form, images: url ? [url, ...rest] : rest });
                  }}
                  onGalleryChange={(urls) => {
                    const main = form.images[0];
                    setForm({ ...form, images: main ? [main, ...urls] : urls });
                  }}
                />
              )}
              <div className="pt-2 border-t border-border/40">
                <Label className="font-body text-xs">הוספת תמונה מקישור (URL)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="bg-background"
                    dir="ltr"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const url = imageUrlInput.trim();
                      if (!url) return;
                      if (!/^https?:\/\//i.test(url)) {
                        toast({ title: "כתובת לא תקינה", description: "הקישור חייב להתחיל ב-http(s)://", variant: "destructive" });
                        return;
                      }
                      setForm({ ...form, images: [...form.images, url] });
                      setImageUrlInput("");
                    }}
                    className="font-body whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 ml-1" /> הוסף
                  </Button>
                </div>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {form.images.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-border">
                        <img src={url} alt={`img-${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })}
                          className="absolute top-1 left-1 bg-background/80 hover:bg-destructive text-foreground hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                          aria-label="מחק תמונה"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 right-1 bg-gold text-primary-foreground text-[9px] font-body px-1.5 py-0.5 rounded">
                            ראשית
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label className="font-body text-xs">תצוגה מקדימה</Label>
              <article className="rounded-2xl border border-gold/40 bg-card overflow-hidden shadow-[0_0_30px_hsl(43_72%_52%/0.1)]">
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  {form.images[0] ? (
                    <img src={form.images[0]} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-background/80 text-foreground border-border backdrop-blur-sm">
                    {form.category}
                  </Badge>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">
                      {form.title || "כותרת הפריט"}
                    </h3>
                    {form.price && (
                      <p className="font-serif text-lg font-bold text-gold whitespace-nowrap">
                        ₪{parseFloat(form.price).toLocaleString("he-IL")}
                      </p>
                    )}
                  </div>
                  <p className="font-body text-sm text-muted-foreground line-clamp-3 min-h-[2.5rem]">
                    {form.description || "תיאור הפריט יופיע כאן..."}
                  </p>
                  <Badge variant="outline" className="font-body text-[10px] border-border/60">
                    <Tag className="h-3 w-3 ml-1" />
                    {conditionLabel(form.condition)}
                  </Badge>
                  {form.contact_phone && (
                    <p className="font-body text-xs text-muted-foreground pt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {form.contact_phone}
                    </p>
                  )}
                </div>
              </article>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t border-border mt-4">
            <Button onClick={handleSubmit} disabled={saving} className="gradient-gold text-primary-foreground font-body flex-1">
              {saving ? "שומר..." : editId ? "שמירת שינויים" : "פרסום מיידי"}
            </Button>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="font-body">ביטול</Button>
          </div>
        </DialogContent>

      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {viewItem && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{viewItem.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {viewItem.images?.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {viewItem.images.map((url, i) => (
                      <img key={i} src={url} alt={`${viewItem.title} ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-border" />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-gold/20 text-gold border-gold/40">{viewItem.category}</Badge>
                  <Badge variant="outline">{conditionLabel(viewItem.condition)}</Badge>
                  {viewItem.is_sold && <Badge variant="destructive">נמכר</Badge>}
                </div>
                {viewItem.price !== null && (
                  <p className="font-serif text-3xl font-bold text-gold">₪{viewItem.price.toLocaleString("he-IL")}</p>
                )}
                {viewItem.description && (
                  <p className="font-body text-foreground whitespace-pre-line">{viewItem.description}</p>
                )}
                {viewItem.contact_phone && !viewItem.is_sold && (
                  <a
                    href={`tel:${viewItem.contact_phone}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-gold text-primary-foreground font-body"
                  >
                    <Phone className="h-4 w-4" />
                    {viewItem.contact_phone}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SecondHand;
