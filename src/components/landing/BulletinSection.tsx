import { useEffect, useRef, useState } from "react";
import { Briefcase, Users, Calendar, Lock, Megaphone, Cake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { useBirthdaysToday } from "@/hooks/useBirthdaysToday";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  isApproved?: boolean;
}

const BulletinSection = ({ isApproved = false }: Props) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { birthdays: todayBirthdays } = useBirthdaysToday();
  const { t } = useLanguage();

  const staticFeatures = [
    { icon: Briefcase, title: t("landing.bulletin.jobsTitle"), description: t("landing.bulletin.jobsDesc") },
    { icon: Users, title: t("landing.bulletin.membersTitle"), description: t("landing.bulletin.membersDesc") },
    { icon: Calendar, title: t("landing.bulletin.eventsTitle"), description: t("landing.bulletin.eventsDesc") },
  ];

  useEffect(() => {
    if (isApproved) {
      supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3)
        .then(({ data }) => setAnnouncements(data || []));
    }
  }, [isApproved]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = sectionRef.current?.querySelectorAll(".bulletin-card");
            if (cards) gsap.fromTo(cards, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.2, ease: "power3.out" });
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [announcements, todayBirthdays]);

  const showRealContent = isApproved && announcements.length > 0;
  const hasBirthdaysToday = isApproved && todayBirthdays.length > 0;

  return (
    <section className="py-8 px-5 sm:py-24 sm:px-6 bg-card/50" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-16 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">{t("landing.bulletin.label")}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {t("landing.bulletin.title1")} <span className="text-gold">{t("landing.bulletin.title2")}</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
        </div>

        {hasBirthdaysToday && (
          <div className="mb-6 sm:mb-8 bulletin-card opacity-0">
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 sm:p-6 flex items-center gap-4 glow-gold">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 border border-gold/30">
                <Cake className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">
                  🎉 {t("landing.birthdays.title1")}!
                </h3>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  {todayBirthdays.map(b => b.full_name).join(", ")} – {t("landing.birthdays.sendWish")} 🎂
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="relative grid gap-4 sm:gap-8 md:grid-cols-3">
          {showRealContent
            ? announcements.map((item) => (
                <div key={item.id} className="bulletin-card opacity-0">
                  <div className="rounded-lg border border-border bg-card p-5 sm:p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)]">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
                      <Megaphone className="h-7 w-7 text-gold" />
                    </div>
                    <h3 className="mb-3 font-serif text-2xl font-bold text-foreground">{item.title}</h3>
                    <p className="font-body text-base leading-relaxed text-muted-foreground line-clamp-3">{item.content}</p>
                    <p className="mt-3 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
                  </div>
                </div>
              ))
            : staticFeatures.map((feature, i) => (
                <div key={i} className="bulletin-card opacity-0">
                  <div className={`rounded-lg border border-border bg-card p-5 sm:p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)] ${!isApproved ? "select-none" : ""}`}>
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-secondary">
                      <feature.icon className="h-7 w-7 text-gold" />
                    </div>
                    <h3 className="mb-3 font-serif text-2xl font-bold text-foreground">{feature.title}</h3>
                    <p className={`font-body text-base leading-relaxed text-muted-foreground ${!isApproved ? "blur-[3px]" : ""}`}>{feature.description}</p>
                  </div>
                </div>
              ))}

          {!isApproved && (
            <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
              <Link to="/register" className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 backdrop-blur-sm px-6 py-3 font-body text-sm text-gold hover:bg-gold/10 transition-colors">
                <Lock className="h-4 w-4" />
                {t("landing.bulletin.joinBtn")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default BulletinSection;
