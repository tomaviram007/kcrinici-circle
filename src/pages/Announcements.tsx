import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageCircle, Gift, Megaphone, ShoppingBag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import PageHero from "@/components/PageHero";
import { fireConfetti } from "@/lib/confetti";
import ClubAboutSection from "@/components/ClubAboutSection";
import heroImg from "@/assets/hero-announcements.jpg";
import gsap from "gsap";

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

const CATEGORIES = [
  { value: "all", label: "הכל", icon: null },
  { value: "announcement", label: "הודעות", icon: Megaphone },
  { value: "sale", label: "מכירות", icon: ShoppingBag },
];

interface BirthdayMember {
  full_name: string;
  birth_date: string;
  phone: string;
  avatar_url: string | null;
}

const Announcements = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "announcement" });
  const [filter, setFilter] = useState("all");
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayMember[]>([]);
  const [birthdayToastShown, setBirthdayToastShown] = useState(false);
  const birthdayRef = useRef<HTMLDivElement>(null);

  const isTuesday = new Date().getDay() === 2;

  const fetchItems = async () => {
    const { data } = await supabase.from("announcements").select("*").eq("is_approved", true).order("created_at", { ascending: false });
    setItems(data || []);
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
        return diffDays >= -1 && diffDays <= 3; // from today to 3 days ahead (and yesterday to catch "today")
      });

      setUpcomingBirthdays(matched as BirthdayMember[]);
    } catch {
      setUpcomingBirthdays([]);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchUpcomingBirthdays();
  }, []);

  // Toast for today's birthdays
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
          sonnerToast(`🎂 מזל טוב ל${p.full_name}!`, {
            description: "חבר/ת המועדון חוגג/ת היום יום הולדת!",
            duration: 8000,
          });
        }, i * 1500);
      });
    }
  }, [upcomingBirthdays, birthdayToastShown]);

  // Animate birthday cards
  useEffect(() => {
    if (upcomingBirthdays.length > 0 && birthdayRef.current) {
      const cards = birthdayRef.current.querySelectorAll(".bday-card");
      gsap.fromTo(cards, { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.12, ease: "back.out(1.3)" });
    }
  }, [upcomingBirthdays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "שגיאה", description: "יש להתחבר כדי לפרסם מודעה", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("announcements").insert({
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      created_by: session.user.id,
    });
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "המודעה נשלחה לאישור!", description: "המודעה תפורסם לאחר אישור מנהל המערכת." });
    fireConfetti();
    setForm({ title: "", content: "", category: "announcement" });
    setShowForm(false);
  };

  const filteredItems = filter === "all" ? items : items.filter((i) => i.category === filter);

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

  return (
    <>
    <PageHero image={heroImg} title="לוח" highlight="מודעות" subtitle="עדכונים, מודעות והודעות חשובות לחברי המועדון" />
    <ClubAboutSection />
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 md:px-6 md:py-12">

      {/* Tuesday Banner */}
      {isTuesday && (
        <div className="mb-6 rounded-lg border border-gold/30 bg-gold/5 p-4 flex items-center gap-3">
          <Calendar className="h-6 w-6 text-gold shrink-0" />
          <div>
            <p className="font-serif text-base font-bold text-gold">📢 היום יום שלישי — יום פרסומים!</p>
            <p className="font-body text-sm text-muted-foreground">
              היום יום הפרסום הרשמי בקבוצת הוואטסאפ של הגברים של קריניצי. שתפו מודעות והזדמנויות!
            </p>
          </div>
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
                  <a
                    href={buildWhatsAppUrl(person.full_name, person.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-md bg-green-600/10 px-2.5 py-1.5 font-body text-xs text-green-600 hover:bg-green-600/20 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    ברכה
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header + Filters */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-serif text-3xl font-bold text-gold/30 sm:text-5xl md:text-6xl">01</span>
            <span className="font-body text-xs sm:text-sm tracking-widest text-gold uppercase">עדכונים</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            לוח מודעות
          </h1>
          <p className="mt-3 font-body text-sm text-muted-foreground max-w-md leading-relaxed">
            המודעות שלנו נועד לתת לכם את המידע באופן רציף והכי עדכני שאפשר שלא תפספסו שום עדכון
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Buttons */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-3 py-2 font-body text-sm transition-colors flex items-center gap-1.5 ${
                  filter === cat.value
                    ? "bg-secondary text-gold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat.icon && <cat.icon className="h-3.5 w-3.5" />}
                {cat.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={() => { setShowForm(!showForm); setForm({ title: "", content: "", category: "announcement" }); }}
            className="gradient-gold text-primary-foreground font-body"
          >
            <Plus className="h-4 w-4 ml-1" /> פרסם מודעה
          </Button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת המודעה" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" autoComplete="off" />
          <Textarea placeholder="תוכן המודעה" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required className="bg-background min-h-[100px]" autoComplete="off" />
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="bg-background font-body w-48">
              <SelectValue placeholder="סוג מודעה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="announcement">הודעה</SelectItem>
              <SelectItem value="sale">מכירה</SelectItem>
            </SelectContent>
          </Select>
          <p className="font-body text-xs text-muted-foreground">* המודעה תפורסם לאחר אישור מנהל המערכת</p>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">שלח לאישור</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm({ title: "", content: "", category: "announcement" }); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      {filteredItems.length === 0 ? (
        <p className="font-body text-muted-foreground text-center py-12">אין מודעות כרגע.</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item, i) => (
            <div
              key={item.id}
              className={`group relative ${ROTATIONS[i % ROTATIONS.length]} hover:rotate-0 transition-transform duration-300`}
            >
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 ${TAPE_COLORS[i % TAPE_COLORS.length]} rounded-sm z-10 shadow-sm`} />
              <div className="relative bg-[#fdf6e3] dark:bg-[#f5f0dc] rounded shadow-lg p-5 pt-6 min-h-[180px] flex flex-col border border-amber-200/30">
                <div className="absolute inset-x-5 top-6 bottom-5 pointer-events-none">
                  {[...Array(8)].map((_, lineIdx) => (
                    <div key={lineIdx} className="border-b border-blue-200/30" style={{ height: "22px" }} />
                  ))}
                </div>
                <div className="relative z-[1] flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif text-lg font-bold text-gray-800 leading-tight">{item.title}</h3>
                    {item.category === "sale" && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-200/60 px-1.5 py-0.5 text-[10px] font-body text-amber-800">
                        <ShoppingBag className="h-3 w-3" /> מכירה
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.content}</p>
                </div>
                <div className="relative z-[1] mt-3">
                  <span className="font-body text-[11px] text-gray-400">
                    {new Date(item.created_at).toLocaleDateString("he-IL")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
};

export default Announcements;
