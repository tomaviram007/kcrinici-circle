import { User, Phone, Briefcase, MapPin, Cake, Heart, MessageCircle, Calendar } from "lucide-react";
import SocialLinks from "@/components/SocialLinks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const isBirthdayToday = (birthDate: string | null): boolean => {
  if (!birthDate) return false;
  const bd = new Date(birthDate + "T00:00:00");
  const now = new Date();
  return bd.getMonth() === now.getMonth() && bd.getDate() === now.getDate();
};

const daysUntilBirthday = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const now = new Date();
  const bd = new Date(birthDate + "T00:00:00");
  const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  const diff = Math.round((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff <= 14 && diff > 0 ? diff : null;
};

const formatHebrewDate = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
};

interface MemberProfilePopupProps {
  member: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MemberProfilePopup = ({ member, open, onOpenChange }: MemberProfilePopupProps) => {
  if (!member) return null;

  const birthdayToday = isBirthdayToday(member.birth_date);
  const daysLeft = daysUntilBirthday(member.birth_date);

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!member.phone) return;
    const cleanPhone = member.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(`היי ${member.full_name}, אני חבר במועדון הגברים של קרניצי. מה שלומך?`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-0" dir="rtl">
        <DialogHeader className="sr-only">
          <DialogTitle>{member.full_name}</DialogTitle>
          <DialogDescription>פרופיל חבר</DialogDescription>
        </DialogHeader>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 h-20 w-20 rounded-full bg-secondary border-2 border-gold/30 overflow-hidden flex items-center justify-center">
              {member.avatar_url ? (
                <img src={member.avatar_url} alt={member.full_name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-gold" />
              )}
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">{member.full_name}</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Briefcase className="h-3.5 w-3.5 text-gold" />
              <span className="font-body text-base text-gold">{member.profession}</span>
            </div>
            {birthdayToday && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-xs font-body text-gold animate-pulse">
                <Cake className="h-3.5 w-3.5" />
                🎂 חוגג יום הולדת היום!
              </div>
            )}
            {!birthdayToday && daysLeft !== null && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-body text-muted-foreground">
                <Cake className="h-3.5 w-3.5 text-gold" />
                עוד {daysLeft} ימים ליום ההולדת 🎉
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3">
            {member.expertise && (
              <div className="flex items-start gap-2.5">
                <Briefcase className="h-3.5 w-3.5 text-gold mt-0.5 flex-shrink-0" />
                <p className="font-body text-sm text-muted-foreground">
                  <span className="text-gold font-medium">מומחיות:</span> {member.expertise}
                </p>
              </div>
            )}

            {member.bio && (
              <p className="font-body text-sm text-muted-foreground italic leading-relaxed text-center px-2">
                "{member.bio}"
              </p>
            )}

            {member.birth_date && !birthdayToday && (
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                <span className="font-body text-sm text-muted-foreground">{formatHebrewDate(member.birth_date)}</span>
              </div>
            )}

            {member.address && (
              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                <span className="font-body text-sm text-muted-foreground">{member.address}</span>
              </div>
            )}

            {member.hobbies && (
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                {member.hobbies.split(/[,،]/).filter(Boolean).map((h: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2.5 py-0.5 font-body text-xs text-muted-foreground">
                    <Heart className="h-2.5 w-2.5 text-gold" />
                    {h.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Social links */}
            <div className="flex justify-center pt-1">
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
              <div className="border-t border-border pt-4 mt-4 flex items-center justify-center gap-2">
                <Phone className="h-3.5 w-3.5 text-gold" />
                <a
                  href={`tel:${member.phone}`}
                  className="font-body text-sm text-foreground hover:text-gold transition-colors"
                  dir="ltr"
                  onClick={(e) => e.stopPropagation()}
                >
                  {member.phone}
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-center pt-2">
              {member.phone && (
                <Button onClick={handleWhatsApp} size="sm" className="gradient-gold text-primary-foreground font-body gap-1.5">
                  <MessageCircle className="h-4 w-4" />
                  וואטסאפ
                </Button>
              )}
              {member.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); window.open(`tel:${member.phone}`, "_self"); }}
                  className="border-gold/30 text-gold hover:bg-gold/10 font-body gap-1.5"
                >
                  <Phone className="h-4 w-4" />
                  חייג
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberProfilePopup;
