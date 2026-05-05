import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageCircle, Gift, Megaphone, ShoppingBag, Calendar, Share2, Car, Smartphone, Sofa, Shirt, Home, Package, Banknote, CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import PageHero from "@/components/PageHero";
import { fireConfetti } from "@/lib/confetti";

import QuoteSection from "@/components/landing/QuoteSection";
import SaleImageUpload from "@/components/announcements/SaleImageUpload";
import heroImg from "@/assets/hero-announcements.jpg";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import ContentWithSidebarAds from "@/components/ads/ContentWithSidebarAds";
import { usePageCover } from "@/hooks/usePageCover";
import gsap from "gsap";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/JGaKYDD7DLzJvzyYyAJejo";

const TAPE_COLORS = ["bg-gold/80", "bg-gold/60", "bg-amber-700/50", "bg-gold/70", "bg-amber-600/40"];
const ROTATIONS = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2", "rotate-0", "-rotate-3", "rotate-3"];

const SALE_TYPES = [
  { value: "car", label: "רכב", icon: Car },
  { value: "electronics", label: "אלקטרוניקה", icon: Smartphone },
  { value: "furniture", label: "ריהוט", icon: Sofa },
  { value: "fashion", label: "ביגוד / אופנה", icon: Shirt },
  { value: "real_estate", label: "נדל״ן", icon: Home },
  { value: "general", label: "כללי", icon: Package },
];

interface SaleField {
  key: string;
  label: string;
  type: "text" | "select";
  options?: string[];
}

const SALE_FIELDS: Record<string, SaleField[]> = {
  car: [
    { key: "price", label: "מחיר", type: "text" },
    { key: "km", label: 'ק"מ', type: "text" },
    { key: "year", label: "שנת ייצור", type: "text" },
    { key: "hand", label: "יד", type: "select", options: ["ראשונה", "שנייה", "שלישית", "רביעית+"] },
    { key: "condition", label: "מצב", type: "select", options: ["חדש", "כמו חדש", "טוב מאוד", "טוב", "סביר"] },
    { key: "test", label: "טסט", type: "select", options: ["בתוקף", "לא בתוקף"] },
    { key: "accident", label: "עבר תאונה", type: "select", options: ["לא", "כן — קל", "כן — בינוני", "כן — קשה"] },
    { key: "color", label: "צבע", type: "text" },
    { key: "ownership", label: "בעלות", type: "select", options: ["פרטי", "חברה", "ליסינג"] },
    { key: "gear", label: "תיבת הילוכים", type: "select", options: ["אוטומט", "ידני"] },
  ],
  electronics: [
    { key: "price", label: "מחיר", type: "text" },
    { key: "condition", label: "מצב", type: "select", options: ["חדש באריזה", "כמו חדש", "משומש — תקין", "דורש תיקון"] },
    { key: "warranty", label: "אחריות", type: "select", options: ["בתוקף", "נגמרה", "אין"] },
    { key: "brand", label: "מותג / יצרן", type: "text" },
    { key: "model", label: "דגם", type: "text" },
  ],
  furniture: [
    { key: "price", label: "מחיר", type: "text" },
    { key: "condition", label: "מצב", type: "select", options: ["חדש", "כמו חדש", "משומש — טוב", "משומש — סביר"] },
    { key: "dimensions", label: "מידות", type: "text" },
    { key: "material", label: "חומר", type: "text" },
    { key: "color", label: "צבע", type: "text" },
  ],
  fashion: [
    { key: "price", label: "מחיר", type: "text" },
    { key: "size", label: "מידה", type: "text" },
    { key: "condition", label: "מצב", type: "select", options: ["חדש עם תגית", "חדש בלי תגית", "לבוש פעם אחת", "משומש — טוב"] },
    { key: "brand", label: "מותג", type: "text" },
    { key: "color", label: "צבע", type: "text" },
  ],
  real_estate: [
    { key: "price", label: "מחיר", type: "text" },
    { key: "type", label: "סוג", type: "select", options: ["מכירה", "השכרה", "שותפים"] },
    { key: "rooms", label: "חדרים", type: "text" },
    { key: "sqm", label: 'שטח (מ"ר)', type: "text" },
    { key: "floor", label: "קומה", type: "text" },
    { key: "area", label: "שכונה / אזור", type: "text" },
    { key: "parking", label: "חניה", type: "select", options: ["כן", "לא"] },
    { key: "elevator", label: "מעלית", type: "select", options: ["כן", "לא"] },
  ],
  general: [
    { key: "price", label: "מחיר", type: "text" },
    { key: "condition", label: "מצב", type: "select", options: ["חדש", "כמו חדש", "משומש — טוב", "משומש — סביר"] },
  ],
};

interface BirthdayMember {
  full_name: string;
  birth_date: string;
  phone: string;
  avatar_url: string | null;
}

const EMPTY_SALE_DATA: Record<string, string> = {};

const Announcements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const coverImage = usePageCover("announcements", heroImg);
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState("announcement");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [saleType, setSaleType] = useState("");
  const [saleData, setSaleData] = useState<Record<string, string>>(EMPTY_SALE_DATA);
  const [saleMainImage, setSaleMainImage] = useState<string | null>(null);
  const [saleGalleryImages, setSaleGalleryImages] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayMember[]>([]);
  const [birthdayToastShown, setBirthdayToastShown] = useState(false);
  const [copyingGroupMsg, setCopyingGroupMsg] = useState(false);
  const birthdayRef = useRef<HTMLDivElement>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isTuesday = new Date().getDay() === 2;

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("announcement");
    setSaleType("");
    setSaleData(EMPTY_SALE_DATA);
    setSaleMainImage(null);
    setSaleGalleryImages([]);
  };

  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, any>>({});

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").eq("is_approved", true).order("created_at", { ascending: false });
    setItems(data || []);

    const creatorIds = [...new Set((data || []).map((a: any) => a.created_by).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", creatorIds);
      const map: Record<string, any> = {};
      profiles?.forEach((p: any) => { map[p.user_id] = p; });
      setCreatorProfiles(map);
    }
  };

  const fetchUpcomingBirthdays = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, birth_date, phone, avatar_url")
        .eq("is_approved", true)
        .not("birth_date", "is", null);
      if (!data) return;
      const now = new Date();
      const matched = data.filter((p) => {
        if (!p.birth_date) return false;
        const bd = new Date(p.birth_date + "T00:00:00");
        const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
        const diffDays = Math.ceil((thisYearBd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= -1 && diffDays <= 3;
      });
      setUpcomingBirthdays(matched as BirthdayMember[]);
    } catch {
      setUpcomingBirthdays([]);
    }
  };

  useEffect(() => { fetchItems(); fetchUpcomingBirthdays(); }, []);

  // Mark announcements as seen when user visits this page
  useEffect(() => {
    if (!user?.id) return;
    import("@/hooks/useUnreadAnnouncements").then(({ markAnnouncementsAsSeen }) => {
      markAnnouncementsAsSeen();
    });
  }, [user?.id]);

  useEffect(() => {
    if (birthdayToastShown || upcomingBirthdays.length === 0) return;
    const now = new Date();
    const todayBirthdays = upcomingBirthdays.filter((p) => {
      const bd = new Date(p.birth_date + "T00:00:00");
      return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
    });
    if (todayBirthdays.length > 0) {
      setBirthdayToastShown(true);
      todayBirthdays.forEach((p, i) => {
        setTimeout(() => {
          sonnerToast(`🎂 מזל טוב ל${p.full_name}!`, { description: "חבר/ת המועדון חוגג/ת היום יום הולדת!", duration: 8000 });
        }, i * 1500);
      });
    }
  }, [upcomingBirthdays, birthdayToastShown]);

  useEffect(() => {
    if (upcomingBirthdays.length > 0 && birthdayRef.current) {
      const cards = birthdayRef.current.querySelectorAll(".bday-card");
      gsap.fromTo(cards, { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: "back.out(1.3)" });
    }
  }, [upcomingBirthdays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;
    if (formCategory === "sale" && !saleType) {
      toast({ title: "שגיאה", description: "יש לבחור סוג מוצר", variant: "destructive" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "שגיאה", description: "יש להתחבר כדי לפרסם מודעה", variant: "destructive" });
      return;
    }

    const insertData: any = {
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      created_by: session.user.id,
    };

    if (formCategory === "sale") {
      insertData.sale_type = saleType;
      const filteredSaleData: Record<string, string> = {};
      Object.entries(saleData).forEach(([k, v]) => { if (v.trim()) filteredSaleData[k] = v.trim(); });
      insertData.sale_data = filteredSaleData;
      insertData.sale_image_url = saleMainImage;
      insertData.sale_gallery_urls = saleGalleryImages;
    }

    const { error } = await supabase.from("announcements").insert(insertData);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "המודעה נשלחה לאישור!", description: "המודעה תפורסם לאחר אישור מנהל המערכת." });
    fireConfetti();
    resetForm();
    setShowForm(false);
  };

  const announcements = items.filter((i) => i.category !== "sale");
  const sales = items.filter((i) => i.category === "sale");

  const filterItems = (list: any[]) => list.filter((i) => {
    if (filterMonth !== "all") {
      const month = new Date(i.created_at).getMonth().toString();
      if (month !== filterMonth) return false;
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const creator = i.created_by && creatorProfiles[i.created_by];
      const creatorName = creator?.full_name?.toLowerCase() || "";
      if (!i.title.toLowerCase().includes(q) && !i.content.toLowerCase().includes(q) && !creatorName.includes(q)) return false;
    }
    return true;
  });

  const filteredAnnouncements = filterItems(announcements);
  const filteredSales = filterItems(sales);

  const buildWhatsAppUrl = (name: string, phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(`היי ${name}, שמעתי שיש לך היום יומהולדת 🎂 מלא מלא מזל טוב! 🎉`);
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  };

  const getDaysUntilBirthday = (birthDate: string) => {
    const now = new Date();
    const bd = new Date(birthDate + "T00:00:00");
    const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    const diff = Math.ceil((thisYearBd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return "היום! 🎂";
    if (diff === 1) return "מחר";
    return `בעוד ${diff} ימים`;
  };

  const saleTypeLabel = (type: string) => SALE_TYPES.find((t) => t.value === type)?.label || type;

  const saleFieldLabel = (key: string, st: string) => {
    const fields = SALE_FIELDS[st] || SALE_FIELDS.general;
    return fields.find((f) => f.key === key)?.label || key;
  };

  const currentSaleFields = saleType ? (SALE_FIELDS[saleType] || SALE_FIELDS.general) : [];

  const buildShareMessage = (item: any) => {
    let msg = `📢 *${item.title}*\n\n${item.content}`;
    if (item.sale_data && typeof item.sale_data === "object") {
      const entries = Object.entries(item.sale_data as Record<string, string>).filter(([, v]) => v);
      if (entries.length > 0) {
        msg += "\n\n📋 *פרטים:*";
        entries.forEach(([k, v]) => {
          msg += `\n• ${saleFieldLabel(k, item.sale_type || "general")}: ${v}`;
        });
      }
    }
    if (item.created_by && creatorProfiles[item.created_by]) {
      const creator = creatorProfiles[item.created_by];
      msg += `\n\n👤 *מפרסם:* ${creator.full_name}`;
      if (creator.phone) msg += `\n📱 ${creator.phone}`;
    }
    msg += "\n\n🏘️ _מודעה מלוח המודעות של הגברים של ק. קריניצי_";
    return encodeURIComponent(msg);
  };

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
  };

  const getAllImages = (item: any): string[] => {
    const imgs: string[] = [];
    if (item.sale_image_url) imgs.push(item.sale_image_url);
    if (item.sale_gallery_urls && Array.isArray(item.sale_gallery_urls)) {
      imgs.push(...item.sale_gallery_urls);
    }
    return imgs;
  };

  // ===== Render announcement card (note-style) =====
  const renderAnnouncementCard = (item: any, i: number) => (
    <div key={item.id} className={`group relative ${ROTATIONS[i % ROTATIONS.length]} hover:rotate-0 transition-transform duration-300`}>
      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 ${TAPE_COLORS[i % TAPE_COLORS.length]} rounded-sm z-10 shadow-sm`} />
      <div className="relative bg-[#fdf6e3] dark:bg-[#f5f0dc] rounded shadow-lg p-5 pt-6 min-h-[180px] flex flex-col border border-amber-200/30">
        <div className="absolute inset-x-5 top-6 bottom-5 pointer-events-none">
          {[...Array(8)].map((_, lineIdx) => (
            <div key={lineIdx} className="border-b border-blue-200/30" style={{ height: "22px" }} />
          ))}
        </div>
        <div className="relative z-[1] flex-1">
          <h3 className="font-serif text-lg font-bold text-gray-800 leading-tight mb-2">{item.title}</h3>
          <p className="font-body text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.content}</p>
        </div>
        <div className="relative z-[1] mt-3">
          <span className="font-body text-[11px] text-gray-400">
            {new Date(item.created_at).toLocaleDateString("he-IL")}
            {item.created_by && creatorProfiles[item.created_by] && (
              <> • {creatorProfiles[item.created_by].full_name}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );

  // ===== Render sale card =====
  const renderSaleCard = (item: any) => {
    const allImages = getAllImages(item);
    return (
      <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Main image */}
        {item.sale_image_url ? (
          <div
            className="relative w-full h-48 cursor-pointer"
            onClick={() => allImages.length > 0 && openLightbox(allImages, 0)}
          >
            <img src={item.sale_image_url} alt={item.title} className="w-full h-full object-cover" />
            {item.is_sold && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-red-500 text-white font-bold px-4 py-1.5 text-lg rounded font-body tracking-wider">SOLD</span>
              </div>
            )}
            {allImages.length > 1 && (
              <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-body px-1.5 py-0.5 rounded">
                +{allImages.length - 1} תמונות
              </span>
            )}
          </div>
        ) : item.is_sold ? (
          <div className="w-full h-24 bg-muted flex items-center justify-center">
            <span className="bg-red-500 text-white font-bold px-4 py-1 text-sm rounded font-body tracking-wider">SOLD</span>
          </div>
        ) : null}

        {/* Gallery thumbnails */}
        {allImages.length > 1 && (
          <div className="flex gap-1 p-2 overflow-x-auto">
            {allImages.slice(0, 4).map((url, idx) => (
              <div
                key={idx}
                className="shrink-0 w-14 h-14 rounded-md overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => openLightbox(allImages, idx)}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {allImages.length > 4 && (
              <div
                className="shrink-0 w-14 h-14 rounded-md bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => openLightbox(allImages, 4)}
              >
                <span className="font-body text-xs text-muted-foreground">+{allImages.length - 4}</span>
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-serif text-base font-bold text-foreground leading-tight flex-1 min-w-0 truncate">{item.title}</h3>
            <div className="flex items-center gap-1 shrink-0 mr-2">
              {!item.is_sold && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-body text-gold">
                  <ShoppingBag className="h-3 w-3" /> {item.sale_type ? saleTypeLabel(item.sale_type) : "מכירה"}
                </span>
              )}
            </div>
          </div>

          <p className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">{item.content}</p>

          {/* Sale data details */}
          {item.sale_data && typeof item.sale_data === "object" && Object.keys(item.sale_data).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(item.sale_data as Record<string, string>).filter(([, v]) => v).slice(0, 4).map(([key, val]) => (
                <span key={key} className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-body text-foreground/70">
                  {key === "price" && <Banknote className="h-2.5 w-2.5" />}
                  {saleFieldLabel(key, item.sale_type || "general")}: {val}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-1 flex-wrap">
            <span className="font-body text-[11px] text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("he-IL")}
              {item.created_by && creatorProfiles[item.created_by] && (
                <> • {creatorProfiles[item.created_by].full_name}</>
              )}
            </span>
            <div className="flex items-center gap-1">
              {user?.id === item.created_by && !item.is_sold && (
                <button
                  onClick={async () => {
                    await supabase.from("announcements").update({ is_sold: true }).eq("id", item.id);
                    toast({ title: "סומן כנמכר!" });
                    fetchItems();
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-body text-foreground/70 hover:bg-secondary/80 transition-colors"
                  title="סמן כנמכר"
                >
                  <CheckCircle2 className="h-3 w-3" /> נמכר
                </button>
              )}
              <a
                href={`https://api.whatsapp.com/send?text=${buildShareMessage(item)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-green-600/10 px-2 py-0.5 text-[10px] font-body text-green-700 hover:bg-green-600/20 transition-colors"
                title="שתף בוואטסאפ"
              >
                <Share2 className="h-3 w-3" /> שתף
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <PageHero image={coverImage} title="לוח" highlight="מודעות" subtitle="עדכונים, מודעות והודעות חשובות לחברי המועדון" />
    <ContentWithSidebarAds targetPage="announcements">
    <div className="mx-auto max-w-6xl px-5 py-4 sm:px-6 sm:py-8 md:py-12">

      {/* Tuesday Banner */}
      {isTuesday && (
        <div className="mb-6 rounded-lg border border-gold/30 bg-gold/5 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-gold shrink-0" />
            <div>
              <p className="font-serif text-base font-bold text-gold">📢 היום יום שלישי — יום פרסומים!</p>
              <p className="font-body text-sm text-muted-foreground">
                היום יום הפרסום הרשמי בקבוצת הוואטסאפ של הגברים של קריניצי. שתפו מודעות והזדמנויות!
              </p>
            </div>
          </div>
          <button
            disabled={copyingGroupMsg}
            onClick={async () => {
              const message = "היום יום הפרסום הרשמי בקבוצת שלנו הגברים של קריניצי. מוזמנים לשתף מודעות והזדמנויות!";
              setCopyingGroupMsg(true);
              let copied = false;
              try {
                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(message);
                  copied = true;
                } else {
                  // Fallback: textarea + execCommand
                  const ta = document.createElement("textarea");
                  ta.value = message;
                  ta.style.position = "fixed";
                  ta.style.opacity = "0";
                  document.body.appendChild(ta);
                  ta.select();
                  copied = document.execCommand("copy");
                  document.body.removeChild(ta);
                }
              } catch {
                copied = false;
              }

              if (copied) {
                toast({ title: "ההודעה הועתקה!", description: "הדביקו אותה בקבוצה (Ctrl/Cmd+V)" });
                window.open(WHATSAPP_GROUP_LINK, "_blank", "noopener,noreferrer");
              } else {
                // Offer download fallback
                try {
                  const blob = new Blob([message], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "הודעה-לקבוצה.txt";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast({ title: "אין הרשאת העתקה", description: "הקובץ ירד למחשב — פתחו והדביקו בקבוצה" });
                } catch {
                  toast({ title: "לא ניתן להעתיק", description: "העתיקו ידנית: " + message });
                }
              }
              setCopyingGroupMsg(false);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-2 font-body text-sm text-green-600 hover:bg-green-600/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <MessageCircle className={`h-4 w-4 ${copyingGroupMsg ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">{copyingGroupMsg ? "מעתיק..." : "לקבוצה"}</span>
          </button>
        </div>
      )}

      {/* Upcoming Birthdays Section */}
      {upcomingBirthdays.length > 0 && (
        <div ref={birthdayRef} className="mb-8 rounded-lg border border-gold/20 bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-lg font-bold text-foreground">🎂 ימי הולדת קרובים</h2>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingBirthdays.map((person, i) => (
              <div key={i} className="bday-card opacity-0 flex items-center gap-3 rounded-lg border border-gold/10 bg-secondary/50 p-3 transition-colors hover:border-gold/30">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/10 overflow-hidden">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <Gift className="h-5 w-5 text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm font-bold text-foreground truncate">{person.full_name}</p>
                  <p className="font-body text-xs text-gold">{getDaysUntilBirthday(person.birth_date)}</p>
                </div>
                {person.phone && (
                  <a href={buildWhatsAppUrl(person.full_name, person.phone)} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-green-600/10 px-2.5 py-1.5 font-body text-xs text-green-600 hover:bg-green-600/20 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> ברכה
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Input placeholder="חיפוש חופשי..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="bg-background w-40 sm:w-52 h-9 font-body text-sm" autoComplete="off" />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="bg-background font-body w-32 h-9 text-sm"><SelectValue placeholder="חודש" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל החודשים</SelectItem>
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>{new Date(2000, i).toLocaleDateString("he-IL", { month: "long" })}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setShowForm(!showForm); resetForm(); }} className="gradient-gold text-primary-foreground font-body mr-auto">
          <Plus className="h-4 w-4 ml-1" /> פרסם מודעה
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-border bg-card p-5 space-y-3">
          <Select value={formCategory} onValueChange={(v) => { setFormCategory(v); if (v !== "sale") { setSaleType(""); setSaleData(EMPTY_SALE_DATA); setSaleMainImage(null); setSaleGalleryImages([]); } }}>
            <SelectTrigger className="bg-background font-body w-48">
              <SelectValue placeholder="סוג מודעה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">הודעה</SelectItem>
              <SelectItem value="sale">מכירה</SelectItem>
            </SelectContent>
          </Select>

          <Input placeholder="כותרת המודעה" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required className="bg-background" autoComplete="off" />
          <Textarea placeholder={formCategory === "sale" ? "תיאור המוצר / הפריט" : "תוכן המודעה"} value={formContent} onChange={(e) => setFormContent(e.target.value)} required className="bg-background min-h-[100px]" autoComplete="off" />

          {/* Sale-specific fields */}
          {formCategory === "sale" && (
            <div className="space-y-3 rounded-lg border border-gold/20 bg-secondary/30 p-4">
              <p className="font-body text-sm font-medium text-gold">📦 פרטי המכירה</p>
              <Select value={saleType} onValueChange={(v) => { setSaleType(v); setSaleData(EMPTY_SALE_DATA); }}>
                <SelectTrigger className="bg-background font-body">
                  <SelectValue placeholder="סוג מוצר" />
                </SelectTrigger>
                <SelectContent>
                  {SALE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" /> {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentSaleFields.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentSaleFields.map((field) => (
                    <div key={field.key}>
                      {field.type === "select" ? (
                        <Select value={saleData[field.key] || ""} onValueChange={(v) => setSaleData({ ...saleData, [field.key]: v })}>
                          <SelectTrigger className="bg-background font-body">
                            <SelectValue placeholder={field.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder={field.label}
                          value={saleData[field.key] || ""}
                          onChange={(e) => setSaleData({ ...saleData, [field.key]: e.target.value })}
                          className="bg-background"
                          autoComplete="off"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Image Upload */}
              {user && (
                <SaleImageUpload
                  userId={user.id}
                  mainImage={saleMainImage}
                  galleryImages={saleGalleryImages}
                  onMainImageChange={setSaleMainImage}
                  onGalleryChange={setSaleGalleryImages}
                />
              )}
            </div>
          )}

          <p className="font-body text-xs text-muted-foreground">* המודעה תפורסם לאחר אישור מנהל המערכת</p>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">שלח לאישור</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      {/* ==================== SECTION 1: ANNOUNCEMENTS ==================== */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-serif text-3xl font-bold text-gold/30 sm:text-5xl md:text-6xl">01</span>
          <span className="font-body text-xs sm:text-sm tracking-widest text-gold uppercase">הודעות</span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-gold" />
          לוח הודעות
        </h2>
        <p className="mt-2 font-body text-sm text-muted-foreground max-w-md leading-relaxed">
          עדכונים, הודעות והודעות חשובות לחברי המועדון
        </p>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <p className="font-body text-muted-foreground text-center py-12">אין הודעות כרגע.</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAnnouncements.map((item, i) => renderAnnouncementCard(item, i))}
        </div>
      )}

      {/* ==================== PREMIUM AD - Between sections ==================== */}
      <div className="my-8">
        <SmartAdBanner
          placement="premium"
          targetPage="announcements"
          slotIndex={0}
          fallbackPlacements={["between_content", "inline", "sidebar", "hero"]}
        />
      </div>

      {/* ==================== SEPARATOR ==================== */}
      <Separator className="my-12" />

      {/* ==================== SECTION 2: SALES ==================== */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline gap-3 mb-2">
          <span className="font-serif text-3xl font-bold text-gold/30 sm:text-5xl md:text-6xl">02</span>
          <span className="font-body text-xs sm:text-sm tracking-widest text-gold uppercase">שוק</span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-gold" />
          לוח מכירות
        </h2>
        <p className="mt-2 font-body text-sm text-muted-foreground max-w-md leading-relaxed">
          מוצרים, שירותים ופריטים למכירה מחברי המועדון
        </p>
      </div>

      {filteredSales.length === 0 ? (
        <p className="font-body text-muted-foreground text-center py-12">אין מודעות מכירה כרגע.</p>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSales.map((item) => renderSaleCard(item))}
        </div>
      )}
    </div>

    {/* Lightbox */}
    <Dialog open={lightboxImages.length > 0} onOpenChange={() => setLightboxImages([])}>
      <DialogContent className="max-w-3xl p-0 bg-black/95 border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>תמונות</DialogTitle>
        </DialogHeader>
        <div className="relative flex items-center justify-center min-h-[50vh]">
          <button
            onClick={() => setLightboxImages([])}
            className="absolute top-3 left-3 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={() => setLightboxIndex((i) => (i + 1) % lightboxImages.length)}
                className="absolute right-3 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <button
                onClick={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)}
                className="absolute left-14 z-20 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            </>
          )}
          <img
            src={lightboxImages[lightboxIndex]}
            alt=""
            className="max-h-[80vh] max-w-full object-contain"
          />
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {lightboxImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${idx === lightboxIndex ? "bg-white" : "bg-white/30"}`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    </ContentWithSidebarAds>
    <QuoteSection page="announcements" />
    </>
  );
};

export default Announcements;
