import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Lock, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import gsap from "gsap";

interface Props {
  isApproved: boolean;
}

const BirthdaysPreviewSection = ({ isApproved }: Props) => {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [greetingTarget, setGreetingTarget] = useState<{ name: string; userId: string } | null>(null);
  const [greetingMsg, setGreetingMsg] = useState("");
  const [sending, setSending] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isApproved) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, birth_date, profession, avatar_url, user_id")
        .eq("is_approved", true)
        .not("birth_date", "is", null);
      if (!data) return;
      const now = new Date();
      const currentMonth = now.getMonth();
      const matched = data.filter((p) => {
        if (!p.birth_date) return false;
        const bd = new Date(p.birth_date + "T00:00:00");
        return bd.getMonth() === currentMonth;
      }).slice(0, 3);
      setBirthdays(matched);
    };
    fetch();
  }, [isApproved]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const cards = sectionRef.current?.querySelectorAll(".bday-preview-card");
          if (cards) gsap.fromTo(cards, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.15, ease: "back.out(1.3)" });
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [birthdays]);

  const handleSendGreeting = async () => {
    if (!greetingTarget || !greetingMsg.trim()) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");
      const { data: senderProfile } = await supabase.from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      await supabase.from("announcements").insert({
        title: `🎂 ברכת יום הולדת ל${greetingTarget.name}`,
        content: `${greetingMsg}\n\n— ${senderProfile?.full_name || "חבר מועדון"}`,
        created_by: session.user.id,
      });
      toast.success("הברכה נשלחה בהצלחה! 🎉");
      setGreetingTarget(null);
      setGreetingMsg("");
    } catch {
      toast.error("שגיאה בשליחת הברכה");
    } finally {
      setSending(false);
    }
  };

  const formatHebrewDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  };

  const mockBirthdays = [
    { full_name: "דוד כהן", birth_date: "1990-02-15", profession: "עורך דין", avatar_url: null, user_id: "m1" },
    { full_name: "אבי לוי", birth_date: "1985-02-20", profession: "רואה חשבון", avatar_url: null, user_id: "m2" },
    { full_name: "יוסי מזרחי", birth_date: "1992-02-25", profession: "מהנדס תוכנה", avatar_url: null, user_id: "m3" },
  ];

  const displayItems = isApproved && birthdays.length > 0 ? birthdays : (!isApproved ? mockBirthdays : birthdays);
  const isEmpty = isApproved && birthdays.length === 0;

  return (
    <>
      <section className="py-12 px-4 sm:py-24 sm:px-6 bg-card/50" ref={sectionRef}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 sm:mb-16 text-center">
            <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">חברי מועדון</p>
            <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
              ימי הולדת <span className="text-gold">החודש</span>
            </h2>
            <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
          </div>

          {isEmpty ? (
            <div className="text-center py-12">
              <Gift className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="font-body text-sm text-muted-foreground">אין ימי הולדת החודש</p>
            </div>
          ) : (
            <div className="relative grid gap-4 sm:gap-6 md:grid-cols-3">
              {displayItems.map((person, i) => (
                <div key={i} className="bday-preview-card opacity-0 rounded-lg border border-gold/20 bg-card p-5 sm:p-8 text-center glow-gold hover:border-gold/40 transition-colors">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 overflow-hidden">
                    {person.avatar_url ? (
                      <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <Gift className="h-7 w-7 text-gold" />
                    )}
                  </div>
                  <h3 className={`font-serif text-xl font-bold text-foreground ${!isApproved ? "blur-[3px]" : ""}`}>{person.full_name}</h3>
                  <p className={`mt-1 font-body text-sm text-gold ${!isApproved ? "blur-[4px]" : ""}`}>{formatHebrewDate(person.birth_date)}</p>
                  <p className={`mt-2 font-body text-sm text-muted-foreground ${!isApproved ? "blur-[4px]" : ""}`}>{person.profession}</p>
                  {isApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-gold/30 text-gold hover:bg-gold/10 font-body gap-1.5"
                      onClick={() => setGreetingTarget({ name: person.full_name, userId: person.user_id })}
                    >
                      <Send className="h-3.5 w-3.5" />
                      שלח ברכה
                    </Button>
                  )}
                </div>
              ))}
              {!isApproved && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Link to="/register" className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 backdrop-blur-sm px-6 py-3 font-body text-sm text-gold hover:bg-gold/10 transition-colors">
                    <Lock className="h-4 w-4" />
                    הצטרף כדי לראות
                  </Link>
                </div>
              )}
            </div>
          )}

          {isApproved && (
            <div className="mt-8 text-center">
              <Link to="/members" className="font-body text-sm text-gold hover:underline">
                לכל החברים ←
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Greeting Dialog */}
      <Dialog open={!!greetingTarget} onOpenChange={(open) => !open && setGreetingTarget(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">🎂 ברכת יום הולדת ל{greetingTarget?.name}</DialogTitle>
          </DialogHeader>
          <Textarea value={greetingMsg} onChange={(e) => setGreetingMsg(e.target.value)} placeholder="כתוב ברכה חמה..." className="min-h-[120px] font-body text-base" dir="rtl" />
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="ghost" onClick={() => setGreetingTarget(null)} className="font-body">ביטול</Button>
            <Button onClick={handleSendGreeting} disabled={!greetingMsg.trim() || sending} className="gradient-gold text-primary-foreground font-body gap-1.5">
              <Send className="h-4 w-4" />
              {sending ? "שולח..." : "שלח ברכה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BirthdaysPreviewSection;
