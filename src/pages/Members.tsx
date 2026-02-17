import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Briefcase } from "lucide-react";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import ClubAboutSection from "@/components/ClubAboutSection";
import heroImg from "@/assets/hero-members.jpg";

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("is_approved", true).order("full_name");
      setMembers(data || []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (members.length > 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".member-card");
      gsap.fromTo(cards, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.4)" });
    }
  }, [members]);

  return (
    <>
    <PageHero image={heroImg} title="אינדקס" highlight="החברים" subtitle="אנשי המקצוע והעשייה של השכונה — הכירו את חברי המועדון" />
    <ClubAboutSection />
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          אינדקס <span className="text-gold">החברים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">אנשי המקצוע של השכונה</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      <div ref={gridRef} className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {members.map((member) => (
          <div key={member.id} className="member-card rounded-lg border border-border bg-card p-4 sm:p-6 transition-shadow hover:border-gold/20 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary border border-gold/20">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.full_name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="h-7 w-7 text-gold" />
                )}
              </div>
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">{member.full_name}</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <Briefcase className="h-3 w-3 text-gold" />
                  <span className="font-body text-sm text-gold">{member.profession}</span>
                </div>
              </div>
            </div>

            {member.expertise && (
              <p className="font-body text-xs text-muted-foreground mb-2">
                <span className="text-gold">מומחיות:</span> {member.expertise}
              </p>
            )}

            {member.bio && (
              <p className="font-body text-xs text-muted-foreground italic leading-relaxed mb-3">"{member.bio}"</p>
            )}

            <div className="border-t border-border pt-3 space-y-1.5">
              {member.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gold" />
                  <a href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '').replace(/^0/, '972')}`} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-foreground hover:text-gold transition-colors" dir="ltr">
                    {member.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {members.length === 0 && <p className="font-body text-muted-foreground">אין חברים מאושרים עדיין.</p>}
    </div>
    </>
  );
};

export default Members;
