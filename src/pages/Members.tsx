import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";
import gsap from "gsap";

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

      // 3D tilt
      cards.forEach((card) => {
        const el = card as HTMLElement;
        el.addEventListener("mousemove", (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(el, { rotateY: x * 12, rotateX: -y * 12, duration: 0.3, ease: "power2.out", transformPerspective: 600 });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out" });
        });
      });
    }
  }, [members]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          אינדקס <span className="text-gold">החברים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">אנשי המקצוע של השכונה</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      <div ref={gridRef} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div key={member.id} className="member-card rounded-lg border border-border bg-card p-6 text-center transition-shadow hover:border-gold/20 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary border border-gold/20">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.full_name} className="h-full w-full rounded-full object-cover" />
              ) : (
                <User className="h-7 w-7 text-gold" />
              )}
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">{member.full_name}</h3>
            <p className="mt-1 font-body text-sm text-gold">{member.profession}</p>
            {member.expertise && <p className="mt-0.5 font-body text-xs text-muted-foreground">{member.expertise}</p>}
            {member.bio && <p className="mt-3 font-body text-xs text-muted-foreground italic leading-relaxed">"{member.bio}"</p>}
          </div>
        ))}
      </div>
      {members.length === 0 && <p className="font-body text-muted-foreground">אין חברים מאושרים עדיין.</p>}
    </div>
  );
};

export default Members;
