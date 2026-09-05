import { useEffect, useState, useMemo } from "react";
import { trackAction } from "@/lib/analytics";
import { sendTelegramNotification } from "@/lib/telegram-notify";
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
import { Plus, Phone, Tag, Trash2, Pencil, CheckCircle2, Package, Lock } from "lucide-react";
import MembersOnlyNotice from "@/components/MembersOnlyNotice";
import { useContentAccess } from "@/hooks/useContentAccess";
import PageHero from "@/components/PageHero";
import { usePageCover } from "@/hooks/usePageCover";
import { useLanguage } from "@/contexts/LanguageContext";
import ListingImageManager, { MAX_LISTING_IMAGES } from "@/components/listings/ListingImageManager";
import ImageLightbox from "@/components/listings/ImageLightbox";
import heroImg from "@/assets/hero-secondhand.jpg";
import ShareButtons from "@/components/ShareButtons";
import Seo from "@/components/Seo";

const CATEGORIES = ["כללי", "רכב", "אלקטרוניקה", "ריהוט", "ביגוד / אופנה", "ספורט ופנאי", "כלי בית", "נדל״ן", "אחר"];
const CONDITIONS = [
  { value: "new", label: "חדש באריזה" },
  { value: "like_new", label: "כמו חדש" },
  { value: "used_good", label: "משומש, טוב מאוד" },
  { value: "used_fair", label: "משומש, סביר" },
  { value: "needs_repair", label: "דורש תיקון" },
];
const conditionLabel = (v: string) => CONDITIONS.find(c => c.value === v)?.label || v;
const soldLabel = (it: { is_sold: boolean; sold_status?: string | null }) =>
  !it.is_sold ? "" : it.sold_status === "given" ? "נמסר" : "נמכר";

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
  sold_status: string | null;
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
  guest_name: "",
  guest_email: "",
};

const SecondHand = () => {
  const { user, isApproved } = useAuth();
  const { isMember, canOpenCard, canSeeContact } = useContentAccess("secondhand");
  const { t } = useLanguage();
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
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showLockedNotice, setShowLockedNotice] = useState(false);
  const [lightbox, setLightbox] = useState<{ item: Item; index: number } | null>(null);


  const fetchItems = async () => {
    setLoading(true);
    if (isMember) {
      const { data } = await (supabase as any).rpc("get_member_secondhand");
      setItems((data || []) as Item[]);
    } else {
      const { data } = await (supabase as any).rpc("get_public_secondhand");
      setItems((data || []) as Item[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [isMember]);

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

  // The details dialog blocks clicks outside itself, so it steps aside while the
  // full screen viewer is open and comes back when the viewer closes.
  const openLightbox = (item: Item, index: number) => {
    setViewItem(null);
    setLightbox({ item, index });
  };

  const closeLightbox = () => {
    const item = lightbox?.item ?? null;
    setLightbox(null);
    if (item) setViewItem(item);
  };

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
      guest_name: "",
      guest_email: "",
    });
    setDialogOpen(true);
  };

  const isGuestFlow = !user;

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: t("secondhand.toastTitleRequired"), variant: "destructive" });
      return;
    }
    if (form.images.length === 0) {
      toast({
        title: "צריך תמונה ראשית",
        description: "מודעה בלי תמונה לא מתפרסמת. אפשר להוסיף עוד ארבע תמונות לגלריה.",
        variant: "destructive",
      });
      return;
    }
    if (isGuestFlow && !editId) {
      if (!form.guest_name.trim() || !form.contact_phone.trim() || !form.guest_email.trim()) {
        toast({ title: "נא למלא שם מלא, טלפון ואימייל", variant: "destructive" });
        return;
      }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guest_email.trim());
      if (!emailOk) {
        toast({ title: "אימייל לא תקין", variant: "destructive" });
        return;
      }
    }
    setSaving(true);

    const basePayload = {
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
      ({ error } = await supabase.from("secondhand_items").update(basePayload).eq("id", editId));
    } else if (isGuestFlow) {
      ({ error } = await supabase.from("secondhand_items").insert({
        ...basePayload,
        created_by: null,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim(),
      } as any));
    } else {
      ({ error } = await supabase.from("secondhand_items").insert({ ...basePayload, created_by: user!.id }));
    }

    if (error) {
      toast({ title: t("secondhand.toastError"), description: error.message, variant: "destructive" });
    } else {
      toast({
        title: editId ? t("secondhand.toastUpdated") : t("secondhand.toastPublished"),
      });
      trackAction(editId ? "secondhand_update" : "secondhand_submit", { guest: isGuestFlow });
      if (!editId) {
        sendTelegramNotification("new_secondhand", {
          title: basePayload.title,
          category: basePayload.category,
          price: basePayload.price !== null ? `₪${basePayload.price}` : "לא צוין",
          publisher: isGuestFlow ? form.guest_name.trim() : "חבר מועדון",
          phone: basePayload.contact_phone || "לא צוין",
          image_url: basePayload.images[0],
        });
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("secondhand.deleteConfirm"))) return;
    const { error } = await supabase.from("secondhand_items").delete().eq("id", id);
    if (error) {
      toast({ title: t("secondhand.toastError"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("secondhand.toastDeleted") });
      fetchItems();
    }
  };

  const setSoldStatus = async (it: Item, status: "sold" | "given" | null) => {
    const { error } = await (supabase as any)
      .from("secondhand_items")
      .update({ is_sold: status !== null, sold_status: status })
      .eq("id", it.id);
    if (error) {
      toast({ title: t("secondhand.toastError"), description: error.message, variant: "destructive" });
    } else {
      fetchItems();
    }
  };

  return (
    <>
      <Seo title="יד שנייה" description="פריטי יד שנייה למכירה ולמסירה בשכונה. פרסום מודעה חינם וקנייה מחברי הקהילה." path="/secondhand" />
      <PageHero
        image={cover}
        title={t("secondhand.heroTitle")}
        highlight={t("secondhand.heroHighlight")}
        subtitle={t("secondhand.heroSubtitle")}
      />

      <div className="page-container py-8 sm:py-12" dir="rtl">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
          <Input
            placeholder={t("secondhand.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs bg-card border-border"
          />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="md:max-w-[180px] bg-card border-border">
              <SelectValue placeholder={t("secondhand.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("secondhand.allCategories")}</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="md:mr-auto">
            <Button onClick={openNew} className="gradient-gold text-primary-foreground font-body w-full md:w-auto">
              <Plus className="h-4 w-4 ml-1" />
              {t("secondhand.postItem")}
            </Button>
            {isGuestFlow && (
              <p className="font-body text-[11px] text-muted-foreground mt-1 text-center md:text-right">
                המודעה מתפרסמת מיד
              </p>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">{t("secondhand.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-body text-muted-foreground">{t("secondhand.noItems")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(it => {
              const isOwner = user?.id === it.created_by;
              return (
                <article
                  key={it.id}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-gold/40 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)] transition-all cursor-pointer"
                  onClick={() => (canOpenCard ? setViewItem(it) : setShowLockedNotice(true))}
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
                          {soldLabel(it)}
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
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Badge variant="outline" className="font-body text-[10px] border-border/60">
                        <Tag className="h-3 w-3 ml-1" />
                        {conditionLabel(it.condition)}
                      </Badge>
                      <ShareButtons
                        title={it.title}
                        text={`${it.title}${it.price !== null ? ` | ₪${it.price.toLocaleString("he-IL")}` : ""} | יד שנייה, הגברים של ק.קרניצי`}
                      />
                    </div>
                    {isOwner && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => openEdit(it)}>
                          <Pencil className="h-3 w-3 ml-1" /> {t("secondhand.edit")}
                        </Button>
                        {it.is_sold ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setSoldStatus(it, null)}>
                            <CheckCircle2 className="h-3 w-3 ml-1" /> החזר למכירה
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setSoldStatus(it, "sold")}>
                              <CheckCircle2 className="h-3 w-3 ml-1" /> סמן כנמכר
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setSoldStatus(it, "given")}>
                              <CheckCircle2 className="h-3 w-3 ml-1" /> סמן כנמסר
                            </Button>
                          </>
                        )}
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
              {editId ? t("secondhand.dialogEditTitle") : t("secondhand.dialogNewTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-2">
            {/* Form fields */}
            <div className="space-y-4 lg:col-span-1">
              {isGuestFlow && !editId && (
                <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 space-y-3">
                  <p className="font-body text-xs text-gold">
                    פרסום כאורח. המודעה עולה לאתר מיד, ונשארים איתך פרטי קשר כדי שיוכלו לחזור אליך.
                  </p>
                  <div>
                    <Label className="font-body text-xs">שם מלא *</Label>
                    <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className="bg-background" />
                  </div>
                  <div>
                    <Label className="font-body text-xs">אימייל *</Label>
                    <Input type="email" dir="ltr" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} className="bg-background" placeholder="name@example.com" />
                  </div>
                </div>
              )}
              <div>
                <Label className="font-body text-xs">{t("secondhand.fieldTitle")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
              </div>
              <div>
                <Label className="font-body text-xs">{t("secondhand.fieldDescription")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={5} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-body text-xs">{t("secondhand.fieldPrice")}</Label>
                  <Input type="number" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-background" />
                </div>
                <div>
                  <Label className="font-body text-xs">{t("secondhand.fieldPhone")}</Label>
                  <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="bg-background" placeholder="0501234567" />
                </div>
                <div>
                  <Label className="font-body text-xs">{t("secondhand.fieldCondition")}</Label>
                  <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="font-body text-xs">{t("secondhand.fieldCategory")}</Label>
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
              <Label className="font-body text-xs">
                {t("secondhand.fieldImages")} <span className="text-gold">*</span>
              </Label>
              <p className="font-body text-[11px] leading-snug text-muted-foreground">
                תמונה ראשית היא חובה, ואפשר להוסיף עוד ארבע לגלריה. כל תמונה יכולה להפוך לראשית בלחיצה.
              </p>
              <div className={form.images.length === 0 ? "rounded-lg border border-gold/40 p-2" : undefined}>
                <ListingImageManager
                  userId={user?.id ?? null}
                  images={form.images}
                  onChange={(urls) => setForm({ ...form, images: urls })}
                />
              </div>
              <div className="pt-2 border-t border-border/40">
                <Label className="font-body text-xs">{t("secondhand.addFromUrl")}</Label>
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
                        toast({ title: t("secondhand.toastInvalidUrl"), description: t("secondhand.toastInvalidUrlDesc"), variant: "destructive" });
                        return;
                      }
                      if (form.images.length >= MAX_LISTING_IMAGES) {
                        toast({ title: `אפשר עד ${MAX_LISTING_IMAGES} תמונות במודעה`, variant: "destructive" });
                        return;
                      }
                      setForm({ ...form, images: [...form.images, url] });
                      setImageUrlInput("");
                    }}
                    className="font-body whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4 ml-1" /> {t("secondhand.addButton")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label className="font-body text-xs">{t("secondhand.preview")}</Label>
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
                      {form.title || t("secondhand.previewTitle")}
                    </h3>
                    {form.price && (
                      <p className="font-serif text-lg font-bold text-gold whitespace-nowrap">
                        ₪{parseFloat(form.price).toLocaleString("he-IL")}
                      </p>
                    )}
                  </div>
                  <p className="font-body text-sm text-muted-foreground line-clamp-3 min-h-[2.5rem]">
                    {form.description || t("secondhand.previewDesc")}
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
              {saving ? t("secondhand.saving") : editId ? t("secondhand.saveChanges") : t("secondhand.publish")}
            </Button>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="font-body">{t("secondhand.cancel")}</Button>
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
                      <button
                        key={i}
                        type="button"
                        onClick={() => openLightbox(viewItem, i)}
                        className="group relative overflow-hidden rounded-lg border border-border transition-colors hover:border-gold"
                        aria-label={`הגדלת תמונה ${i + 1}`}
                      >
                        <img
                          src={url}
                          alt={`${viewItem.title} ${i + 1}`}
                          className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {i === 0 && (
                          <span className="absolute bottom-1 right-1 rounded bg-gold px-1.5 py-0.5 font-body text-[9px] text-primary-foreground">
                            {t("secondhand.mainImage")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-gold/20 text-gold border-gold/40">{viewItem.category}</Badge>
                  <Badge variant="outline">{conditionLabel(viewItem.condition)}</Badge>
                  {viewItem.is_sold && <Badge variant="destructive">{soldLabel(viewItem)}</Badge>}
                </div>
                {viewItem.price !== null && (
                  <p className="font-serif text-3xl font-bold text-gold">₪{viewItem.price.toLocaleString("he-IL")}</p>
                )}
                {viewItem.description && (
                  <p className="font-body text-foreground whitespace-pre-line">{viewItem.description}</p>
                )}
                {!viewItem.is_sold && (
                  canSeeContact && viewItem.contact_phone ? (
                    <a
                      href={`tel:${viewItem.contact_phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-gold text-primary-foreground font-body"
                    >
                      <Phone className="h-4 w-4" />
                      {viewItem.contact_phone}
                    </a>
                  ) : !canSeeContact ? (
                    <MembersOnlyNotice variant="secondhand" compact />
                  ) : null
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLockedNotice} onOpenChange={setShowLockedNotice}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none" dir="rtl">
          <MembersOnlyNotice variant="secondhand" />
        </DialogContent>
      </Dialog>

      {lightbox && (
        <ImageLightbox
          images={lightbox.item.images}
          startIndex={lightbox.index}
          title={lightbox.item.title}
          caption={[lightbox.item.category, conditionLabel(lightbox.item.condition)].join(" | ")}
          onClose={closeLightbox}
        />
      )}
    </>
  );
};

export default SecondHand;
