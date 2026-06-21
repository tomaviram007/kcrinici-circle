import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Cake } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import gsap from "gsap";
import MemberProfilePopup from "@/components/MemberProfilePopup";
import BirthdayActionsDialog from "@/components/BirthdayActionsDialog";
import { useUserPermissions } from "@/hooks/useUserPermissions";

interface Props {
  isApproved: boolean;
}

const BirthdaysPreviewSection = ({ isApproved }: Props) => {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [viewMember, setViewMember] = useState<any | null>(null);
  const [actionsPerson, setActionsPerson] = useState<any | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { hasPermission } = useUserPermissions();
  const isAdmin = hasPermission("all") || hasPermission("manage_birthdays") || hasPermission("manage_members");

  const handleOpenProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
    if (data) setViewMember(data);
    else toast.error("לא נמצאו פרטי חבר");
  };

  const handleCardClick = (person: any) => {
    if (!isApproved) return;
    if (isAdmin) {
      setActionsPerson(person);
    } else {
      handleOpenProfile(person.user_id);
    }
  };

  useEffect(() => {
    if (!isApproved) return;
    const fetchBirthdays = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, birth_date, profession, avatar_url, user_id")
        .eq("is_approved", true)
        .not("birth_date", "is", null);
      if (!data) return;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentDate = now.getDate();

      // Get birthdays this month, sorted by day
      const matched = data
        .filter((p) => {
          if (!p.birth_date) return false;
          const bd = new Date(p.birth_date + "T00:00:00");
          return bd.getMonth() === currentMonth;
        })
        .sort((a, b) => {
          const da = new Date(a.birth_date + "T00:00:00").getDate();
          const db = new Date(b.birth_date + "T00:00:00").getDate();
          return da - db;
        })
        .slice(0, 6);

      setBirthdays(matched);
    };
    fetchBirthdays();
  }, [isApproved]);

  useEffect(() => {
    if (!sectionRef.current || birthdays.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const cards = sectionRef.current?.querySelectorAll(".bday-cube");
          if (cards) {
            gsap.fromTo(
              cards,
              { opacity: 0, y: 30, scale: 0.9 },
              { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08, ease: "back.out(1.4)" }
            );
          }
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [birthdays]);

  const isBirthdayToday = (dateStr: string) => {
    const now = new Date();
    const bd = new Date(dateStr + "T00:00:00");
    return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  };

  const mockBirthdays = [
    { full_name: "דוד כהן", birth_date: "1990-03-23", profession: "עורך דין", avatar_url: null, user_id: "m1" },
    { full_name: "אבי לוי", birth_date: "1985-03-25", profession: "רואה חשבון", avatar_url: null, user_id: "m2" },
    { full_name: "יוסי מזרחי", birth_date: "1992-03-27", profession: "מהנדס תוכנה", avatar_url: null, user_id: "m3" },
    { full_name: "משה ישראלי", birth_date: "1988-03-28", profession: "אדריכל", avatar_url: null, user_id: "m4" },
  ];

  const displayItems = isApproved && birthdays.length > 0 ? birthdays : !isApproved ? mockBirthdays : [];

  if (isApproved && birthdays.length === 0) return null;

  return (
    <>
    <section id="birthdays-section" className="py-8 px-5 sm:py-16 sm:px-6" dir="rtl" ref={sectionRef}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 sm:mb-16 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">
            חוגגים החודש
          </p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            ימי הולדת <span className="text-gold">במועדון</span>
          </h2>
          <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
        </div>

        {(
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {displayItems.map((person, i) => {
                const isToday = isBirthdayToday(person.birth_date);
                return (
                  <div
                    key={i}
                    className={`bday-cube opacity-0 group relative rounded-xl p-4 text-center transition-all duration-300 cursor-pointer
                      border backdrop-blur-md bg-card/40
                      ${isToday
                        ? "border-gold/50 shadow-[0_0_20px_hsl(var(--gold)/0.25)]"
                        : "border-border/40 hover:border-gold/30"
                      }
                      hover:scale-105 hover:bg-card/60`}
                    onClick={() => isApproved && handleOpenProfile(person.user_id)}
                    title={isApproved ? `פרופיל של ${person.full_name}` : ""}
                  >
                    {isToday && (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-background text-xs animate-pulse">
                        🎂
                      </div>
                    )}

                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 border border-gold/20 overflow-hidden">
                      {person.avatar_url ? (
                        <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <Cake className="h-5 w-5 text-gold" />
                      )}
                    </div>

                    <h3
                      className={`font-serif text-sm font-bold text-foreground leading-tight ${!isApproved ? "blur-[3px]" : ""}`}
                    >
                      {person.full_name}
                    </h3>

                    <p className={`mt-1 font-body text-xs text-gold ${!isApproved ? "blur-[3px]" : ""}`}>
                      {formatDate(person.birth_date)}
                    </p>

                    {isApproved && (
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <span className="inline-flex items-center gap-1 text-xs text-gold font-body">
                          לחץ לפרטים ←
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!isApproved && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Link
                  to="/register"
                  className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 backdrop-blur-sm px-6 py-3 font-body text-sm text-gold hover:bg-gold/10 transition-colors"
                >
                  <Lock className="h-4 w-4" />
                  הצטרף כדי לראות
                </Link>
              </div>
            )}
          </div>
        )}

        {isApproved && (
          <div className="mt-6 text-center">
            <Link to="/members" className="font-body text-sm text-gold hover:underline">
              לכל החברים ←
            </Link>
          </div>
        )}
      </div>
    </section>
    <MemberProfilePopup member={viewMember} open={!!viewMember} onOpenChange={(o) => !o && setViewMember(null)} />
    </>
  );
};

export default BirthdaysPreviewSection;
