import { useEffect, useRef, useState } from "react";
import { Gift, Lock, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBirthdaysThisWeek } from "@/hooks/useBirthdaysThisWeek";
import gsap from "gsap";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Props {
  isApproved?: boolean;
}

const createConfetti = (container: HTMLElement) => {
  const colors = ["#D4AF37", "#C5961D", "#E6C547", "#B8860B", "#FFD700"];
  for (let i = 0; i < 30; i++) {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;width:${4 + Math.random() * 6}px;height:${4 + Math.random() * 6}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? "50%" : "0"};pointer-events:none;opacity:0;`;
    container.appendChild(el);
    gsap.fromTo(el,
      { opacity: 1, x: container.offsetWidth / 2, y: container.offsetHeight / 2 },
      { x: Math.random() * container.offsetWidth, y: -50 - Math.random() * 200, rotation: Math.random() * 720, opacity: 0, duration: 1.5 + Math.random(), ease: "power2.out", delay: Math.random() * 0.5, onComplete: () => el.remove() }
    );
  }
};

const formatHebrewDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
};

const BirthdaysSection = ({ isApproved = false }: Props) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const confettiTriggered = useRef(false);
  const { birthdays, loading } = useBirthdaysThisWeek();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (birthdays.length === 0 || !sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = sectionRef.current?.querySelectorAll(".birthday-card");
            if (cards) gsap.fromTo(cards, { opacity: 0, y: 40, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.15, ease: "back.out(1.3)" });
            if (!confettiTriggered.current && sectionRef.current && isApproved) {
              confettiTriggered.current = true;
              setTimeout(() => createConfetti(sectionRef.current!), 600);
            }
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [isApproved, birthdays]);

  const handleSendGreeting = (name: string, userId: string) => {
    setSending(true);
    supabase.from("profiles").select("phone").eq("user_id", userId).maybeSingle().then(({ data }) => {
      setSending(false);
      if (!data?.phone) {
        toast.error("לא נמצא מספר טלפון לחבר זה");
        return;
      }
      const cleanPhone = data.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
      const msg = encodeURIComponent(`היי ${name}, המון מזל טוב ליום הולדתך 🎂`);
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
      toast.success("מועבר לוואטסאפ! 🎉");
    });
  };

  if (loading) return null;
  if (birthdays.length === 0) return null;

  return (
    <section className="relative py-12 px-4 sm:py-24 sm:px-6 overflow-hidden" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-16 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">חוגגים השבוע</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            ימי הולדת <span className="text-gold">במועדון</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        <div className="relative grid gap-4 sm:gap-6 md:grid-cols-3">
          {birthdays.map((person, i) => (
            <div key={i} className="birthday-card opacity-0 rounded-lg border border-gold/20 bg-card p-5 sm:p-8 text-center glow-gold hover:border-gold/40 transition-colors">
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
                  onClick={() => handleSendGreeting(person.full_name, person.user_id)}
                >
                  <Send className="h-3.5 w-3.5" />
                  שלח ברכה
                </Button>
              )}
            </div>
          ))}

          {!isApproved && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Link to="/register" className="flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 backdrop-blur-sm px-6 py-3 font-body text-sm text-gold hover:bg-gold/10 transition-colors">
                <Lock className="h-4 w-4" />
                הצטרף כדי לראות
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BirthdaysSection;
