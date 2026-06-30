import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Briefcase, MapPin, Cake, Heart, MessageCircle, Calendar, ArrowRight } from "lucide-react";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import SocialLinks from "@/components/SocialLinks";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-members.jpg";
import { usePageCover } from "@/hooks/usePageCover";

const isBirthdayToday = (birthDate: string | null): boolean => {
  if (!birthDate) return false;
  const bd = new Date(birthDate + "T00:00:00");
  const now = new Date();
  return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
};

const formatHebrewDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
};

const MemberProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const coverImage = usePageCover("members", heroImg);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMember = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("is_approved", true)
        .single();
      setMember(data);
      setLoading(false);
    };
    fetchMember();
  }, [id]);

  useEffect(() => {
    if (member && cardRef.current) {
      gsap.fromTo(cardRef.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    }
  }, [member]);

  const handleWhatsApp = () => {
    if (!member?.phone) return;
    const cleanPhone = member.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(`היי ${member.full_name}, אני חבר במועדון הגברים של קרניצי. מה שלומך?`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const birthdayToday = member ? isBirthdayToday(member.birth_date) : false;

  return (
    <>
      <PageHero image={coverImage} title="פרופיל" highlight="חבר" subtitle="אנשי המקצוע והעשייה של השכונה" />

      <div className="page-container py-4 sm:py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/members")}
          className="mb-6 font-body text-muted-foreground hover:text-gold gap-1.5"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לאינדקס החברים
        </Button>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground font-body">טוען...</div>
        ) : !member ? (
          <div className="text-center py-20 text-muted-foreground font-body">החבר לא נמצא</div>
        ) : (
          <div ref={cardRef} className="rounded-xl border border-gold/20 bg-card p-6 sm:p-10 glow-gold">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="mb-4 h-24 w-24 rounded-full bg-secondary border-2 border-gold/30 overflow-hidden flex items-center justify-center">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-gold" />
                )}
              </div>
              <h1 className="font-serif text-3xl font-bold text-foreground">{member.full_name}</h1>
              <div className="flex items-center gap-1.5 mt-2">
                <Briefcase className="h-4 w-4 text-gold" />
                <span className="font-body text-lg text-gold">{member.profession}</span>
              </div>
              {birthdayToday && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/30 px-4 py-1.5 text-sm font-body text-gold animate-pulse">
                  <Cake className="h-4 w-4" />
                  🎂 חוגג/ת יום הולדת היום!
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4 max-w-lg mx-auto">
              {member.expertise && (
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 text-gold mt-1 flex-shrink-0" />
                  <p className="font-body text-sm text-muted-foreground">
                    <span className="text-gold font-medium">מומחיות:</span> {member.expertise}
                  </p>
                </div>
              )}

              {member.bio && (
                <p className="font-body text-sm text-muted-foreground italic leading-relaxed text-center">
                  "{member.bio}"
                </p>
              )}

              {member.birth_date && !birthdayToday && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gold flex-shrink-0" />
                  <span className="font-body text-sm text-muted-foreground">{formatHebrewDate(member.birth_date)}</span>
                </div>
              )}

              {member.address && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gold flex-shrink-0" />
                  <span className="font-body text-sm text-muted-foreground">{member.address}</span>
                </div>
              )}

              {member.hobbies && (
                <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                  {member.hobbies.split(/[,،]/).filter(Boolean).map((h: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-3 py-1 font-body text-xs text-muted-foreground">
                      <Heart className="h-3 w-3 text-gold" />
                      {h.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Social links */}
              <div className="flex justify-center pt-2">
                <SocialLinks
                  website_url={member.website_url}
                  facebook_url={member.facebook_url}
                  instagram_url={member.instagram_url}
                  linkedin_url={member.linkedin_url}
                  size="md"
                />
              </div>

              {/* Contact */}
              {member.phone && (
                <div className="border-t border-border pt-5 mt-5 flex items-center justify-center gap-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gold" />
                    <a
                      href={`tel:${member.phone}`}
                      className="font-body text-base text-foreground hover:text-gold transition-colors"
                      dir="ltr"
                    >
                      {member.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center pt-2">
                {member.phone && (
                  <Button onClick={handleWhatsApp} className="gradient-gold text-primary-foreground font-body gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    וואטסאפ
                  </Button>
                )}
                {member.phone && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`tel:${member.phone}`, "_self")}
                    className="border-gold/30 text-gold hover:bg-gold/10 font-body gap-1.5"
                  >
                    <Phone className="h-4 w-4" />
                    חייג
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MemberProfile;
