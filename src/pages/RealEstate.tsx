import { useEffect, useState, useMemo, type ReactNode } from "react";
import { trackAction } from "@/lib/analytics";
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
import { Plus, Phone, Trash2, Pencil, CheckCircle2, X, Home, BedDouble, Building2, Ruler, MapPin, CalendarDays } from "lucide-react";
import MembersOnlyNotice from "@/components/MembersOnlyNotice";
import { useContentAccess } from "@/hooks/useContentAccess";
import PageHero from "@/components/PageHero";
import { usePageCover } from "@/hooks/usePageCover";
import { useLanguage } from "@/contexts/LanguageContext";
import SaleImageUpload from "@/components/announcements/SaleImageUpload";
import heroImg from "@/assets/hero-realestate.jpg";
import ShareButtons from "@/components/ShareButtons";
import Seo from "@/components/Seo";

const PROPERTY_TYPES = ["דירה", "דירת גן", "פנטהאוז / גג", "דופלקס", "בית פרטי", "יחידת דיור", "אחר"];
const LISTING_TYPES = [
  { value: "rent", label: "להשכרה" },
  { value: "sale", label: "למכירה" },
];
const listingTypeLabel = (v: string) => LISTING_TYPES.find(t => t.value === v)?.label || v;
const closedLabel = (it: { listing_type: string }) => (it.listing_type === "rent" ? "הושכרה" : "נמכרה");

interface Listing {
  id: string;
  title: string;
  description: string | null;
  listing_type: string;
  property_type: string;
  rooms: number | null;
  floor_number: number | null;
  size_sqm: number | null;
  price: number | null;
  currency: string;
  address: string | null;
  available_from: string | null;
  images: string[];
  contact_phone: string | null;
  is_closed: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  description: "",
  listing_type: "rent",
  property_type: "דירה",
  rooms: "",
  floor_number: "",
  size_sqm: "",
  price: "",
  address: "",
  available_from: "",
  contact_phone: "",
  images: [] as string[],
  guest_name: "",
  guest_email: "",
};

const formatPrice = (it: { price: number | null; listing_type: string }) =>
  it.price !== null ? `₪${it.price.toLocaleString("he-IL")}${it.listing_type === "rent" ? " לחודש" : ""}` : null;

const specParts = (it: { rooms: number | null; floor_number: number | null; size_sqm: number | null }) => {
  const parts: { icon: typeof BedDouble; text: string }[] = [];
  if (it.rooms !== null) parts.push({ icon: BedDouble, text: `${it.rooms} חדרים` });
  if (it.floor_number !== null) parts.push({ icon: Building2, text: it.floor_number === 0 ? "קרקע" : `קומה ${it.floor_number}` });
  if (it.size_sqm !== null) parts.push({ icon: Ruler, text: `${it.size_sqm} מ״ר` });
  return parts;
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h4 className="flex items-center gap-3 font-body text-[11px] font-bold tracking-wider text-gold/80">
      {title}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/25" />
    </h4>
    {children}
  </section>
);

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="font-body text-xs text-muted-foreground">{label}</Label>
    {children}
    {hint && <p className="font-body text-[10px] leading-snug text-muted-foreground/70">{hint}</p>}
  </div>
);

const RealEstate = () => {
  const { user } = useAuth();
  const { isMember, canOpenCard, canSeeContact } = useContentAccess("realestate");
  const { t } = useLanguage();
  const { toast } = useToast();
  const cover = usePageCover("realestate", heroImg);
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewItem, setViewItem] = useState<Listing | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showLockedNotice, setShowLockedNotice] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    if (isMember) {
      const { data } = await (supabase as any).rpc("get_member_realestate");
      setItems((data || []) as Listing[]);
    } else {
      const { data } = await (supabase as any).rpc("get_public_realestate");
      setItems((data || []) as Listing[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [isMember]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (typeFilter !== "all" && it.listing_type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !it.title.toLowerCase().includes(q) &&
          !(it.description || "").toLowerCase().includes(q) &&
          !(it.address || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [items, search, typeFilter]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (it: Listing) => {
    setEditId(it.id);
    setForm({
      title: it.title,
      description: it.description || "",
      listing_type: it.listing_type,
      property_type: it.property_type,
      rooms: it.rooms?.toString() || "",
      floor_number: it.floor_number?.toString() || "",
      size_sqm: it.size_sqm?.toString() || "",
      price: it.price?.toString() || "",
      address: it.address || "",
      available_from: it.available_from || "",
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
      toast({ title: t("realestate.toastTitleRequired"), variant: "destructive" });
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
      listing_type: form.listing_type,
      property_type: form.property_type,
      rooms: form.rooms ? parseFloat(form.rooms) : null,
      floor_number: form.floor_number !== "" ? parseInt(form.floor_number, 10) : null,
      size_sqm: form.size_sqm ? parseFloat(form.size_sqm) : null,
      price: form.price ? parseFloat(form.price) : null,
      address: form.address.trim() || null,
      available_from: form.available_from || null,
      contact_phone: form.contact_phone.trim() || null,
      images: form.images,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from("realestate_listings").update(basePayload).eq("id", editId));
    } else if (isGuestFlow) {
      ({ error } = await supabase.from("realestate_listings").insert({
        ...basePayload,
        created_by: null,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim(),
      }));
    } else {
      ({ error } = await supabase.from("realestate_listings").insert({ ...basePayload, created_by: user!.id }));
    }

    if (error) {
      toast({ title: t("realestate.toastError"), description: error.message, variant: "destructive" });
    } else {
      toast({
        title: editId
          ? t("realestate.toastUpdated")
          : isGuestFlow
            ? "המודעה התקבלה וממתינה לאישור מנהל"
            : t("realestate.toastPublished"),
      });
      trackAction(editId ? "realestate_update" : "realestate_submit", { guest: isGuestFlow });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditId(null);
      fetchItems();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("realestate.deleteConfirm"))) return;
    const { error } = await supabase.from("realestate_listings").delete().eq("id", id);
    if (error) {
      toast({ title: t("realestate.toastError"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("realestate.toastDeleted") });
      fetchItems();
    }
  };

  const setClosed = async (it: Listing, closed: boolean) => {
    const { error } = await supabase.from("realestate_listings").update({ is_closed: closed }).eq("id", it.id);
    if (error) {
      toast({ title: t("realestate.toastError"), description: error.message, variant: "destructive" });
    } else {
      fetchItems();
    }
  };

  const TypeBadge = ({ type, className = "" }: { type: string; className?: string }) => (
    <Badge
      className={
        (type === "rent"
          ? "bg-gold text-primary-foreground border-transparent"
          : "bg-background/85 text-gold border-gold/60 backdrop-blur-sm") + " " + className
      }
    >
      {listingTypeLabel(type)}
    </Badge>
  );

  return (
    <>
      <Seo title="נדל״ן בשכונה" description="דירות להשכרה ולמכירה בשכונת ק.קרניצי, פרסום מודעה חינם ישירות מהשכנים, בלי תיווך." path="/realestate" />
      <PageHero
        image={cover}
        title={t("realestate.heroTitle")}
        highlight={t("realestate.heroHighlight")}
        subtitle={t("realestate.heroSubtitle")}
      />

      <div className="page-container py-8 sm:py-12" dir="rtl">
        {/* Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center gap-3">
          <Input
            placeholder={t("realestate.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-xs bg-card border-border"
          />
          <div className="flex rounded-lg border border-border bg-card p-1 gap-1">
            {[{ value: "all", label: t("realestate.filterAll") }, ...LISTING_TYPES].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`px-4 py-1.5 rounded-md font-body text-sm transition-colors ${
                  typeFilter === opt.value
                    ? "gradient-gold text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="md:mr-auto">
            <Button onClick={openNew} className="gradient-gold text-primary-foreground font-body w-full md:w-auto">
              <Plus className="h-4 w-4 ml-1" />
              {t("realestate.postListing")}
            </Button>
            {isGuestFlow && (
              <p className="font-body text-[11px] text-muted-foreground mt-1 text-center md:text-right">
                המודעה תפורסם לאחר אישור מנהל
              </p>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground font-body py-12">{t("realestate.loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Home className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-body text-muted-foreground">{t("realestate.noListings")}</p>
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
                        <Home className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {it.is_closed && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <span className="rotate-[-12deg] border-4 border-destructive text-destructive font-serif font-bold text-3xl px-6 py-1 rounded">
                          {closedLabel(it)}
                        </span>
                      </div>
                    )}
                    <TypeBadge type={it.listing_type} className="absolute top-2 right-2" />
                    <Badge className="absolute top-2 left-2 bg-background/80 text-foreground border-border backdrop-blur-sm">
                      {it.property_type}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">{it.title}</h3>
                      {it.price !== null && (
                        <p className="font-serif text-lg font-bold text-gold whitespace-nowrap">
                          {formatPrice(it)}
                        </p>
                      )}
                    </div>
                    {specParts(it).length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {specParts(it).map((p, i) => (
                          <span key={i} className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                            <p.icon className="h-3.5 w-3.5 text-gold/70" />
                            {p.text}
                          </span>
                        ))}
                      </div>
                    )}
                    {it.address && (
                      <p className="font-body text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gold/70" /> {it.address}
                      </p>
                    )}
                    <p className="font-body text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {it.description || "—"}
                    </p>
                    <div className="flex items-center justify-end pt-1">
                      <ShareButtons
                        title={it.title}
                        text={`${it.title}, ${listingTypeLabel(it.listing_type)}${it.price !== null ? `, ${formatPrice(it)}` : ""} | נדל״ן בשכונה, הגברים של ק.קרניצי`}
                      />
                    </div>
                    {isOwner && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => openEdit(it)}>
                          <Pencil className="h-3 w-3 ml-1" /> {t("realestate.edit")}
                        </Button>
                        {it.is_closed ? (
                          <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setClosed(it, false)}>
                            <CheckCircle2 className="h-3 w-3 ml-1" /> החזר ללוח
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => setClosed(it, true)}>
                            <CheckCircle2 className="h-3 w-3 ml-1" /> {it.listing_type === "rent" ? "סמן כהושכרה" : "סמן כנמכרה"}
                          </Button>
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
              {editId ? t("realestate.dialogEditTitle") : t("realestate.dialogNewTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-2">
            {/* Form fields */}
            <div className="space-y-6 lg:col-span-3">
              {isGuestFlow && !editId && (
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 space-y-3">
                  <p className="font-body text-xs text-gold">
                    פרסום כאורח. המודעה תעבור אישור מנהל לפני שתופיע באתר.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="שם מלא *">
                      <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className="bg-background h-11" />
                    </Field>
                    <Field label="אימייל *">
                      <Input type="email" dir="ltr" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} className="bg-background h-11" placeholder="name@example.com" />
                    </Field>
                  </div>
                </div>
              )}

              <Section title="מה מפרסמים">
                <div className="grid grid-cols-2 gap-3">
                  {LISTING_TYPES.map(lt => {
                    const active = form.listing_type === lt.value;
                    return (
                      <button
                        key={lt.value}
                        type="button"
                        onClick={() => setForm({ ...form, listing_type: lt.value })}
                        aria-pressed={active}
                        className={`rounded-xl border-2 px-4 py-3 text-center transition-all ${
                          active
                            ? "border-gold bg-gold/10 shadow-[0_0_20px_hsl(43_72%_52%/0.15)]"
                            : "border-border bg-background hover:border-gold/40"
                        }`}
                      >
                        <span className={`block font-serif text-base font-bold ${active ? "text-gold" : "text-foreground"}`}>
                          {lt.label}
                        </span>
                        <span className="block font-body text-[11px] text-muted-foreground mt-0.5">
                          {lt.value === "rent" ? "שכירות חודשית" : "מכירת הנכס"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Section title="פרטי הנכס">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label={t("realestate.fieldPropertyType")}>
                    <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                      <SelectTrigger className="bg-background h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label={t("realestate.fieldTitle")}>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background h-11" placeholder="לדוגמה: 4 חדרים משופצת ברחוב הראשונים" />
                    </Field>
                  </div>
                </div>
                <Field label={t("realestate.fieldDescription")} hint="מה שווה שהשכנים ידעו: מרפסת, חניה, ממ״ד, שיפוץ, קומה אחרונה.">
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" rows={4} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label={t("realestate.fieldRooms")}>
                    <Input type="number" inputMode="decimal" step="0.5" min="0" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} className="bg-background h-11" placeholder="4" />
                  </Field>
                  <Field label={t("realestate.fieldFloor")}>
                    <Input type="number" inputMode="numeric" value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: e.target.value })} className="bg-background h-11" placeholder="2" />
                  </Field>
                  <Field label={t("realestate.fieldSize")}>
                    <Input type="number" inputMode="decimal" min="0" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} className="bg-background h-11" placeholder="95" />
                  </Field>
                </div>
              </Section>

              <Section title="מחיר וכניסה">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={form.listing_type === "rent" ? t("realestate.fieldPriceRent") : t("realestate.fieldPriceSale")}>
                    <div className="relative">
                      <Input type="number" inputMode="decimal" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-background h-11 pl-9" placeholder={form.listing_type === "rent" ? "4,500" : "2,300,000"} />
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-muted-foreground">₪</span>
                    </div>
                  </Field>
                  <Field label={t("realestate.fieldAvailableFrom")}>
                    <Input type="date" value={form.available_from} onChange={(e) => setForm({ ...form, available_from: e.target.value })} className="bg-background h-11" />
                  </Field>
                </div>
              </Section>

              <Section title="יצירת קשר">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={t("realestate.fieldPhone")}>
                    <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="bg-background h-11" placeholder="0501234567" />
                  </Field>
                  <Field label={t("realestate.fieldAddress")} hint="בלי מספר בית. את הכתובת המדויקת מוסרים בטלפון.">
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-background h-11" placeholder="רחוב הראשונים" />
                  </Field>
                </div>
              </Section>

              <Section title={t("realestate.fieldImages")}>
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
                <Field label={t("realestate.addFromUrl")}>
                  <div className="flex gap-2">
                    <Input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://..."
                      className="bg-background h-11"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const url = imageUrlInput.trim();
                        if (!url) return;
                        if (!/^https?:\/\//i.test(url)) {
                          toast({ title: t("realestate.toastInvalidUrl"), variant: "destructive" });
                          return;
                        }
                        setForm({ ...form, images: [...form.images, url] });
                        setImageUrlInput("");
                      }}
                      className="font-body whitespace-nowrap h-11"
                    >
                      <Plus className="h-4 w-4 ml-1" /> {t("realestate.addButton")}
                    </Button>
                  </div>
                </Field>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
                            {t("realestate.mainImage")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* Live preview */}
            <div className="space-y-2 lg:col-span-2 lg:sticky lg:top-2 lg:self-start">
              <Label className="font-body text-xs text-muted-foreground">{t("realestate.preview")}</Label>
              <article className="rounded-2xl border border-gold/40 bg-card overflow-hidden shadow-[0_0_30px_hsl(43_72%_52%/0.1)]">
                <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                  {form.images[0] ? (
                    <img src={form.images[0]} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <TypeBadge type={form.listing_type} className="absolute top-2 right-2" />
                  <Badge className="absolute top-2 left-2 bg-background/80 text-foreground border-border backdrop-blur-sm">
                    {form.property_type}
                  </Badge>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-lg font-bold text-foreground line-clamp-1">
                      {form.title || t("realestate.previewTitle")}
                    </h3>
                    {form.price && (
                      <p className="font-serif text-lg font-bold text-gold whitespace-nowrap">
                        ₪{parseFloat(form.price).toLocaleString("he-IL")}{form.listing_type === "rent" ? " לחודש" : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {form.rooms && (
                      <span className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                        <BedDouble className="h-3.5 w-3.5 text-gold/70" /> {form.rooms} חדרים
                      </span>
                    )}
                    {form.floor_number !== "" && (
                      <span className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 text-gold/70" /> {parseInt(form.floor_number, 10) === 0 ? "קרקע" : `קומה ${form.floor_number}`}
                      </span>
                    )}
                    {form.size_sqm && (
                      <span className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                        <Ruler className="h-3.5 w-3.5 text-gold/70" /> {form.size_sqm} מ״ר
                      </span>
                    )}
                  </div>
                  {form.address && (
                    <p className="font-body text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gold/70" /> {form.address}
                    </p>
                  )}
                  <p className="font-body text-sm text-muted-foreground line-clamp-3 min-h-[2.5rem]">
                    {form.description || t("realestate.previewDesc")}
                  </p>
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
              {saving ? t("realestate.saving") : editId ? t("realestate.saveChanges") : t("realestate.publish")}
            </Button>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="font-body">{t("realestate.cancel")}</Button>
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
                  <TypeBadge type={viewItem.listing_type} />
                  <Badge variant="outline">{viewItem.property_type}</Badge>
                  {viewItem.is_closed && <Badge variant="destructive">{closedLabel(viewItem)}</Badge>}
                </div>
                {viewItem.price !== null && (
                  <p className="font-serif text-3xl font-bold text-gold">{formatPrice(viewItem)}</p>
                )}
                {specParts(viewItem).length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {specParts(viewItem).map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 font-body text-sm text-foreground">
                        <p.icon className="h-4 w-4 text-gold" /> {p.text}
                      </span>
                    ))}
                  </div>
                )}
                {viewItem.address && (
                  <p className="font-body text-sm text-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-gold" /> {viewItem.address}
                  </p>
                )}
                {viewItem.available_from && (
                  <p className="font-body text-sm text-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-gold" /> כניסה מ־{new Date(viewItem.available_from).toLocaleDateString("he-IL")}
                  </p>
                )}
                {viewItem.description && (
                  <p className="font-body text-foreground whitespace-pre-line">{viewItem.description}</p>
                )}
                {!viewItem.is_closed && (
                  canSeeContact && viewItem.contact_phone ? (
                    <a
                      href={`tel:${viewItem.contact_phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-gold text-primary-foreground font-body"
                    >
                      <Phone className="h-4 w-4" />
                      {viewItem.contact_phone}
                    </a>
                  ) : !canSeeContact ? (
                    <MembersOnlyNotice variant="realestate" compact />
                  ) : null
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showLockedNotice} onOpenChange={setShowLockedNotice}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none" dir="rtl">
          <MembersOnlyNotice variant="realestate" />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RealEstate;
