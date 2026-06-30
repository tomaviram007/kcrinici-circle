import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageCircle, Gift, Megaphone, Calendar, Share2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import PageHero from "@/components/PageHero";
import { fireConfetti } from "@/lib/confetti";

import QuoteSection from "@/components/landing/QuoteSection";
import heroImg from "@/assets/hero-announcements.jpg";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import ContentWithSidebarAds from "@/components/ads/ContentWithSidebarAds";
import { usePageCover } from "@/hooks/usePageCover";
import gsap from "gsap";
import { Separator } from "@/components/ui/separator";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/JGaKYDD7DLzJvzyYyAJejo";

interface BirthdayMember {
  full_name: string;
  birth_date: string;
  phone: string;
  avatar_url: string | null;
}

const Announcements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasPermission } = useUserPermissions();
  const canEditAnnouncements = hasPermission("manage_announcements");
  const coverImage = usePageCover("announcements", heroImg);
  const [items, setItems] = useState<any[]>([]);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayMember[]>([]);
  const [birthdayToastShown, setBirthdayToastShown] = useState(false);
  const [copyingGroupMsg, setCopyingGroupMsg] = useState(false);
  const birthdayRef = useRef<HTMLDivElement>(null);

  const todayDow = new Date().getDay();

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
  };

  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, any>>({});

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").eq("is_approved", true).eq("category", "announcement").order("created_at", { ascending: false });
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

  const fetchPromoBanners = async () => {
    const { data } = await supabase
      .from("promo_banners")
      .select("*")
      .eq("is_active", true)
      .eq("target_page", "announcements")
      .order("display_order", { ascending: true });
    const now = new Date();
    const dow = now.getDay();
    const filtered = (data || []).filter((b: any) => {
      if (b.days_of_week && b.days_of_week.length > 0 && !b.days_of_week.includes(dow)) return false;
      if (b.start_date && new Date(b.start_date) > now) return false;
      if (b.end_date && new Date(b.end_date) < now) return false;
      return true;
    });
    setPromoBanners(filtered);
  };

  useEffect(() => { fetchItems(); fetchUpcomingBirthdays(); fetchPromoBanners(); }, []);

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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "שגיאה", description: "יש להתחבר כדי לפרסם מודעה", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: formTitle.trim(),
      content: formContent.trim(),
      category: "announcement",
      created_by: session.user.id,
    });

    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "המודעה נשלחה לאישור!", description: "המודעה תפורסם לאחר אישור מנהל המערכת." });
    fireConfetti();
    resetForm();
    setShowForm(false);
  };

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

  const filteredAnnouncements = filterItems(items);

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

  const buildShareMessage = (item: any) => {
    let msg = `📢 *${item.title}*\n\n${item.content}`;
    if (item.created_by && creatorProfiles[item.created_by]) {
      const creator = creatorProfiles[item.created_by];
      msg += `\n\n👤 *מפרסם:* ${creator.full_name}`;
      if (creator.phone) msg += `\n📱 ${creator.phone}`;
    }
    msg += "\n\n🏘️ _מודעה מלוח המודעות של הגברים של ק.קרניצי_";
    return encodeURIComponent(msg);
  };

  // ===== Render announcement card (banner style) =====
  const renderAnnouncementCard = (item: any, i: number) => {
    const creator = item.created_by ? creatorProfiles[item.created_by] : null;
    return (
      <div
        key={item.id}
        className="group relative rounded-xl border border-gold/30 bg-card/60 p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:border-gold/60 transition-colors"
      >
        <div className="shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-gold/10 border border-gold/30">
          <Megaphone className="h-5 w-5 text-gold" />
        </div>

        <div className="flex-1 min-w-0 text-right">
          <h3 className="font-serif text-base sm:text-lg font-bold text-gold leading-tight mb-1">
            {item.title}
          </h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {item.content}
          </p>
          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] font-body text-muted-foreground/70">
            <Calendar className="h-3 w-3" />
            <span>{new Date(item.created_at).toLocaleDateString("he-IL")}</span>
            {creator?.full_name && <span>• {creator.full_name}</span>}
          </div>
        </div>

        <a
          href={`https://api.whatsapp.com/send?text=${buildShareMessage(item)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-2 font-body text-xs sm:text-sm text-green-600 hover:bg-green-600/20 transition-colors"
          title="שתף בוואטסאפ"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">לקבוצה</span>
        </a>
      </div>
    );
  };

  return (
    <>
    <PageHero image={coverImage} title="לוח" highlight="מודעות" subtitle="עדכונים, מודעות והודעות חשובות לחברי המועדון">
      {canEditAnnouncements && (
        <button
          onClick={() => navigate("/admin?tab=announcements")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3 py-1.5 font-body text-xs text-gold hover:bg-gold/30 transition-colors"
          title="ערוך מודעות"
        >
          <Pencil className="h-3 w-3" /> ערוך מודעות
        </button>
      )}
    </PageHero>
    <ContentWithSidebarAds targetPage="announcements">
    <div className="page-container py-4 sm:py-8 md:py-12">

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
          <Input placeholder="כותרת המודעה" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required className="bg-background" autoComplete="off" />
          <Textarea placeholder="תוכן המודעה" value={formContent} onChange={(e) => setFormContent(e.target.value)} required className="bg-background min-h-[100px]" autoComplete="off" />

          <p className="font-body text-xs text-muted-foreground">* המודעה תפורסם לאחר אישור מנהל המערכת</p>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">שלח לאישור</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      {/* ==================== SECTION: ANNOUNCEMENTS ==================== */}
      <div className="mb-6 sm:mb-8 mx-auto max-w-md text-center flex flex-col items-center">
        <div className="flex items-baseline justify-center gap-3 mb-2">
          <span className="font-serif text-3xl font-bold text-gold/30 sm:text-5xl md:text-6xl">01</span>
          <span className="font-body text-xs sm:text-sm tracking-widest text-gold uppercase">הודעות</span>
        </div>
        <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl flex items-center justify-center gap-2">
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
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filteredAnnouncements.map((item, i) => renderAnnouncementCard(item, i))}
        </div>
      )}

      {/* ==================== PREMIUM AD ==================== */}
      <div className="my-8">
        <SmartAdBanner
          placement="premium"
          targetPage="announcements"
          slotIndex={0}
          fallbackPlacements={["between_content", "inline", "sidebar", "hero"]}
        />
      </div>
    </div>

    </ContentWithSidebarAds>
    <QuoteSection page="announcements" />
    </>
  );
};

export default Announcements;
