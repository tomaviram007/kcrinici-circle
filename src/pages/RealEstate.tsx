import { useEffect, useState, useMemo, useRef, type ReactNode } from "react";
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
import { Plus, Phone, Trash2, Pencil, CheckCircle2, Home, BedDouble, Building2, Ruler, MapPin, CalendarDays, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import MembersOnlyNotice from "@/components/MembersOnlyNotice";
import { useContentAccess } from "@/hooks/useContentAccess";
import PageHero from "@/components/PageHero";
import { usePageCover } from "@/hooks/usePageCover";
import { useLanguage } from "@/contexts/LanguageContext";
import ListingImageManager, { MAX_LISTING_IMAGES } from "@/components/realestate/ListingImageManager";
import ImageLightbox from "@/components/realestate/ImageLightbox";
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

/** Turns 0501234567 into an international number WhatsApp accepts. */
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
};

interface ListingCardProps {
  it: Listing;
  isOwner: boolean;
  canSeeContact: boolean;
  onOpen: (startIndex: number) => void;
  onEdit: () => void;
  onToggleClosed: () => void;
  onDelete: () => void;
  onLockedContact: () => void;
}

/**
 * Everything a neighbour needs sits on the card itself: the photos can be
 * browsed in place and the publisher can be reached without opening anything.
 */
const ListingCard = ({
  it,
  isOwner,
  canSeeContact,
  onOpen,
  onEdit,
  onToggleClosed,
  onDelete,
  onLockedContact,
}: ListingCardProps) => {
  const images = it.images || [];
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const current = Math.min(idx, Math.max(images.length - 1, 0));
  const go = (delta: number) => {
    if (images.length < 2) return;
    setIdx((i) => (i + delta + images.length) % images.length);
  };

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 40) go(delta < 0 ? -1 : 1);
  };

  const phone = it.contact_phone;
  const canCall = canSeeContact && !!phone && !it.is_closed;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <article
      className="group relative h-[460px] cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 ease-out hover:-translate-y-2 hover:border-gold/50 hover:shadow-[0_20px_50px_-15px_hsl(43_72%_52%/0.3)]"
      onClick={() => onOpen(current)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.length > 0 ? (
        images.map((url, i) => (
          <img
            key={`${url}-${i}`}
            src={url}
            alt={`${it.title} ${i + 1}`}
            loading={i === 0 ? "lazy" : "eager"}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 group-hover:scale-110 motion-safe:transition-transform ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          />
        ))
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <Home className="h-14 w-14 text-muted-foreground/25" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" />

      {it.is_closed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70">
          <span className="rotate-[-12deg] rounded border-4 border-destructive px-6 py-1 font-serif text-3xl font-bold text-destructive">
            {closedLabel(it)}
          </span>
        </div>
      )}

      {/* Browse the photos without leaving the board */}
      {images.length > 1 && !it.is_closed && (
        <>
          <button
            type="button"
            onClick={(e) => { stop(e); go(1); }}
            aria-label="התמונה הבאה"
            className="absolute end-2 top-[30%] z-20 -translate-y-1/2 rounded-full bg-background/70 p-1.5 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); go(-1); }}
            aria-label="התמונה הקודמת"
            className="absolute start-2 top-[30%] z-20 -translate-y-1/2 rounded-full bg-background/70 p-1.5 text-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-background focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 top-12 z-20 flex justify-center gap-1.5" onClick={stop}>
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { stop(e); setIdx(i); }}
                aria-label={`תמונה ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-5 bg-gold" : "w-1.5 bg-foreground/40 hover:bg-foreground/70"
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
        <TypeBadge type={it.listing_type} />
        <Badge className="border-border bg-background/80 text-foreground backdrop-blur-sm">
          {it.property_type}
        </Badge>
      </div>

      {isOwner && (
        <div
          className="absolute end-3 top-20 z-20 flex flex-col gap-1 rounded-lg border border-border/60 bg-background/85 p-1 backdrop-blur-sm"
          onClick={stop}
        >
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="עריכה" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title={it.is_closed ? "החזר ללוח" : it.listing_type === "rent" ? "סמן כהושכרה" : "סמן כנמכרה"}
            onClick={onToggleClosed}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" title="מחיקה" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-10 space-y-3 p-5">
        <div className="space-y-1.5">
          <h3 className="line-clamp-1 font-serif text-2xl font-bold text-foreground">{it.title}</h3>

          {it.address && (
            <p className="flex items-center gap-1 font-body text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-gold/80" /> {it.address}
            </p>
          )}

          {specParts(it).length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
              {specParts(it).map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 font-body text-xs text-muted-foreground">
                  <p.icon className="h-3.5 w-3.5 text-gold/80" />
                  {p.text}
                </span>
              ))}
            </div>
          )}

          {it.description && (
            <div className="pt-1">
              <h4 className="font-body text-[10px] font-bold tracking-wider text-gold/80">על הנכס</h4>
              <p className="line-clamp-2 font-body text-xs leading-relaxed text-muted-foreground">
                {it.description}
              </p>
            </div>
          )}

          {it.price !== null && (
            <p className="pt-1 font-serif text-2xl font-bold text-gold">{formatPrice(it)}</p>
          )}
        </div>

        {/* Reach the publisher straight from the board */}
        <div className="flex items-center gap-2" onClick={stop}>
          {canCall ? (
            <>
              <a
                href={`tel:${phone}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-3 py-2 font-body text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Phone className="h-4 w-4" />
                חייג
              </a>
              <a
                href={`https://wa.me/${waNumber(phone!)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold/50 px-3 py-2 font-body text-sm text-gold transition-colors hover:bg-gold/10"
              >
                <MessageCircle className="h-4 w-4" />
                וואטסאפ
              </a>
            </>
          ) : it.is_closed ? null : (
            <button
              type="button"
              onClick={onLockedContact}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-3 py-2 font-body text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Phone className="h-4 w-4" />
              יצירת קשר
            </button>
          )}
          <ShareButtons
            title={it.title}
            text={`${it.title}, ${listingTypeLabel(it.listing_type)}${it.price !== null ? `, ${formatPrice(it)}` : ""} | נדל״ן בשכונה, הגברים של ק.קרניצי`}
          />
        </div>
      </div>
    </article>
  );
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
  const [lightbox, setLightbox] = useState<{ it: Listing; index: number } | null>(null);
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
      images: (it.images || []).slice(0, MAX_LISTING_IMAGES),
      guest_name: "",
      guest_email: "",
    });
    setDialogOpen(true);
  };

  const isGuestFlow = !user;

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: "חסרה כותרת למודעה", variant: "destructive" });
      return;
    }
    if (isGuestFlow && !editId) {
      // Name each missing field on its own, so it is clear what to fix.
      if (!form.guest_name.trim()) {
        toast({ title: "חסר שם מלא", description: "בלי שם אי אפשר לאשר את המודעה.", variant: "destructive" });
        return;
      }
      if (!form.guest_email.trim()) {
        toast({ title: "חסר אימייל", description: "האימייל משמש אותנו רק כדי לעדכן אותך שהמודעה אושרה.", variant: "destructive" });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.guest_email.trim())) {
        toast({ title: "האימייל לא תקין", description: "בדוק את הכתובת ונסה שוב.", variant: "destructive" });
        return;
      }
      if (!form.contact_phone.trim()) {
        toast({ title: "חסר טלפון ליצירת קשר", description: "זה השדה שדרכו שכנים יפנו אליך. נמצא תחת יצירת קשר.", variant: "destructive" });
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
      images: form.images.slice(0, MAX_LISTING_IMAGES),
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
      if (!editId) {
        sendTelegramNotification("new_realestate", {
          title: basePayload.title,
          listing_type: listingTypeLabel(basePayload.listing_type),
          property_type: basePayload.property_type,
          rooms: basePayload.rooms ?? "לא צוין",
          price: basePayload.price !== null ? `₪${basePayload.price}` : "לא צוין",
          location: basePayload.address || "לא צוין",
          publisher: isGuestFlow ? form.guest_name.trim() : "חבר מועדון",
          phone: basePayload.contact_phone || "לא צוין",
          photos: basePayload.images.length,
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
              // The public RPC omits created_by, so both sides can be undefined.
              // Owner controls require a signed in user matching a real owner id.
              const isOwner = !!user?.id && !!it.created_by && user.id === it.created_by;
              return (
                <ListingCard
                  key={it.id}
                  it={it}
                  isOwner={isOwner}
                  canSeeContact={canSeeContact}
                  onOpen={(index) => (canOpenCard ? setLightbox({ it, index }) : setShowLockedNotice(true))}
                  onEdit={() => openEdit(it)}
                  onToggleClosed={() => setClosed(it, !it.is_closed)}
                  onDelete={() => handleDelete(it.id)}
                  onLockedContact={() => setShowLockedNotice(true)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="w-[96vw] max-w-6xl max-h-[92vh] p-0 gap-0 flex flex-col overflow-hidden"
          dir="rtl"
        >
          <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border/60 text-right sm:text-right">
            <DialogTitle className="font-serif text-lg sm:text-xl">
              {editId ? t("realestate.dialogEditTitle") : t("realestate.dialogNewTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-5">
              {/* Column A */}
              <div className="lg:col-span-4 space-y-4">
                <Section title="מה מפרסמים">
                  <div className="grid grid-cols-2 gap-2">
                    {LISTING_TYPES.map(lt => {
                      const active = form.listing_type === lt.value;
                      return (
                        <button
                          key={lt.value}
                          type="button"
                          onClick={() => setForm({ ...form, listing_type: lt.value })}
                          aria-pressed={active}
                          className={`rounded-xl border-2 px-3 py-2.5 text-center transition-all ${
                            active
                              ? "border-gold bg-gold/10 shadow-[0_0_20px_hsl(43_72%_52%/0.15)]"
                              : "border-border bg-background hover:border-gold/40"
                          }`}
                        >
                          <span className={`block font-serif text-base font-bold ${active ? "text-gold" : "text-foreground"}`}>
                            {lt.label}
                          </span>
                          <span className="block font-body text-[10px] text-muted-foreground mt-0.5">
                            {lt.value === "rent" ? "שכירות חודשית" : "מכירת הנכס"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Section>

                <Section title="פרטי הנכס">
                  <Field label={t("realestate.fieldPropertyType")}>
                    <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                      <SelectTrigger className="bg-background h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t("realestate.fieldTitle")}>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background h-10" placeholder="4 חדרים משופצת ברחוב הראשונים" />
                  </Field>
                  <div className="grid grid-cols-3 gap-2">
                    <Field label={t("realestate.fieldRooms")}>
                      <Input type="number" inputMode="decimal" step="0.5" min="0" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} className="bg-background h-10" placeholder="4" />
                    </Field>
                    <Field label={t("realestate.fieldFloor")}>
                      <Input type="number" inputMode="numeric" value={form.floor_number} onChange={(e) => setForm({ ...form, floor_number: e.target.value })} className="bg-background h-10" placeholder="2" />
                    </Field>
                    <Field label={t("realestate.fieldSize")}>
                      <Input type="number" inputMode="decimal" min="0" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} className="bg-background h-10" placeholder="95" />
                    </Field>
                  </div>
                </Section>
              </div>

              {/* Column B */}
              <div className="lg:col-span-4 space-y-4">
                <Section title="מחיר וכניסה">
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={form.listing_type === "rent" ? t("realestate.fieldPriceRent") : t("realestate.fieldPriceSale")}>
                      <div className="relative">
                        <Input type="number" inputMode="decimal" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-background h-10 pl-8" placeholder={form.listing_type === "rent" ? "4500" : "2300000"} />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-muted-foreground">₪</span>
                      </div>
                    </Field>
                    <Field label={t("realestate.fieldAvailableFrom")}>
                      <Input type="date" value={form.available_from} onChange={(e) => setForm({ ...form, available_from: e.target.value })} className="bg-background h-10" />
                    </Field>
                  </div>
                </Section>

                <Section title="יצירת קשר">
                  {isGuestFlow && !editId && (
                    <>
                      <p className="rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-1.5 font-body text-[10px] leading-snug text-gold">
                        פרסום כאורח. המודעה תעבור אישור מנהל לפני שתופיע באתר.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="שם מלא *">
                          <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} className="bg-background h-10" placeholder="השם שלך" />
                        </Field>
                        <Field label="אימייל *">
                          <Input type="email" dir="ltr" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} className="bg-background h-10" placeholder="name@example.com" />
                        </Field>
                      </div>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={isGuestFlow ? `${t("realestate.fieldPhone")} *` : t("realestate.fieldPhone")}>
                      <Input
                        value={form.contact_phone}
                        onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                        className={`bg-background h-10 ${isGuestFlow && !form.contact_phone.trim() ? "border-gold/50" : ""}`}
                        inputMode="tel"
                        placeholder="מספר טלפון"
                      />
                    </Field>
                    <Field label={t("realestate.fieldAddress")}>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-background h-10" placeholder="רחוב הראשונים" />
                    </Field>
                  </div>
                  <p className="font-body text-[10px] leading-snug text-muted-foreground/70">
                    בלי מספר בית. את הכתובת המדויקת מוסרים בטלפון.
                  </p>
                </Section>

                <Section title={t("realestate.fieldDescription")}>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="bg-background resize-none"
                    rows={3}
                    placeholder="מרפסת, חניה, ממ״ד, שיפוץ, קומה אחרונה. מה ששווה שהשכנים ידעו."
                  />
                </Section>
              </div>

              {/* Column C: images + live preview */}
              <div className="md:col-span-2 lg:col-span-4 space-y-4">
                <Section title={t("realestate.fieldImages")}>
                  <ListingImageManager
                    userId={user?.id || null}
                    images={form.images}
                    onChange={(urls) => setForm({ ...form, images: urls })}
                  />
                </Section>

                <Section title={t("realestate.preview")}>
                  <article className="flex gap-2.5 rounded-xl border border-gold/40 bg-card p-2 shadow-[0_0_25px_hsl(43_72%_52%/0.08)]">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {form.images[0] ? (
                        <img src={form.images[0]} alt="preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Home className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate font-serif text-sm font-bold text-foreground">
                          {form.title || t("realestate.previewTitle")}
                        </h3>
                        {form.price && (
                          <p className="whitespace-nowrap font-serif text-sm font-bold text-gold">
                            ₪{parseFloat(form.price).toLocaleString("he-IL")}{form.listing_type === "rent" ? "/ח׳" : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <TypeBadge type={form.listing_type} className="h-4 px-1.5 text-[9px]" />
                        <span className="font-body text-[10px] text-muted-foreground">{form.property_type}</span>
                        {form.rooms && <span className="font-body text-[10px] text-muted-foreground">{form.rooms} חד׳</span>}
                        {form.floor_number !== "" && (
                          <span className="font-body text-[10px] text-muted-foreground">
                            {parseInt(form.floor_number, 10) === 0 ? "קרקע" : `ק׳ ${form.floor_number}`}
                          </span>
                        )}
                        {form.size_sqm && <span className="font-body text-[10px] text-muted-foreground">{form.size_sqm} מ״ר</span>}
                      </div>
                      {form.address && (
                        <p className="flex items-center gap-1 truncate font-body text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5 shrink-0 text-gold/70" /> {form.address}
                        </p>
                      )}
                    </div>
                  </article>
                </Section>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex gap-2 px-5 py-3 border-t border-border bg-card/40">
            <Button onClick={handleSubmit} disabled={saving} className="gradient-gold text-primary-foreground font-body flex-1 h-11">
              {saving ? t("realestate.saving") : editId ? t("realestate.saveChanges") : t("realestate.publish")}
            </Button>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="font-body h-11">{t("realestate.cancel")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo viewer, opened by clicking a card */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.it.images || []}
          startIndex={lightbox.index}
          title={lightbox.it.title}
          caption={[listingTypeLabel(lightbox.it.listing_type), lightbox.it.address, formatPrice(lightbox.it)]
            .filter(Boolean)
            .join(" · ")}
          onClose={() => setLightbox(null)}
        />
      )}

      <Dialog open={showLockedNotice} onOpenChange={setShowLockedNotice}>
        <DialogContent className="sm:max-w-md p-0 bg-transparent border-0 shadow-none" dir="rtl">
          <MembersOnlyNotice variant="realestate" />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RealEstate;
