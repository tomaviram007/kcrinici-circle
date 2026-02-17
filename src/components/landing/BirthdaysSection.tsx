import { useEffect, useRef, useState } from "react";
import { Gift, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import gsap from "gsap";

interface Props {
  isApproved?: boolean;
}

interface BirthdayMember {
  full_name: string;
  birth_date: string;
  profession: string;
  avatar_url: string | null;
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
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        // Get current week range (month-day only for comparison)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday

        // Fetch all approved profiles with birth_date
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, birth_date, profession, avatar_url")
          .eq("is_approved", true)
          .not("birth_date", "is", null);

        if (error) throw error;

        // Filter by matching month/day within this week
        const matched = (data || []).filter((p) => {
          if (!p.birth_date) return false;
          const bd = new Date(p.birth_date + "T00:00:00");
          const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
          return thisYearBd >= startOfWeek && thisYearBd <= endOfWeek;
        });

        setBirthdays(matched as BirthdayMember[]);
      } catch {
        setBirthdays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

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
