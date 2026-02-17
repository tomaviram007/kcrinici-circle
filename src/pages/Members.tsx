import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Briefcase, MapPin, Pencil } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import ClubAboutSection from "@/components/ClubAboutSection";
import heroImg from "@/assets/hero-members.jpg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", profession: "", expertise: "", bio: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const fetchMembers = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("is_approved", true).order("full_name");
    setMembers(data || []);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setCurrentUserId(session.user.id);
      await fetchMembers();
    };
    init();
  }, []);

  useEffect(() => {
    if (members.length > 0 && gridRef.current) {
      const cards = gridRef.current.querySelectorAll(".member-card");
      gsap.fromTo(cards, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.4)" });
    }
  }, [members]);

  const openEdit = (member: any) => {
    setEditMember(member);
    setEditForm({
      full_name: member.full_name || "",
      profession: member.profession || "",
      expertise: member.expertise || "",
      bio: member.bio || "",
      phone: member.phone || "",
      address: member.address || "",
    });
  };

  const handleSave = async () => {
    if (!editMember) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: editForm.full_name,
      profession: editForm.profession,
      expertise: editForm.expertise,
      bio: editForm.bio,
      phone: editForm.phone,
      address: editForm.address,
    }).eq("id", editMember.id);
    setSaving(false);

    if (error) {
      toast({ title: "שגיאה", description: "לא הצלחנו לעדכן את הפרופיל", variant: "destructive" });
    } else {
      toast({ title: "עודכן בהצלחה!" });
      setEditMember(null);
      await fetchMembers();
    }
  };

  const isOwnCard = (member: any) => currentUserId && member.user_id === currentUserId;

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
          <div
            key={member.id}
            className={`member-card rounded-lg border border-border bg-card p-4 sm:p-6 transition-shadow hover:border-gold/20 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)] ${isOwnCard(member) ? "cursor-pointer ring-1 ring-gold/30" : ""}`}
            onClick={() => isOwnCard(member) && openEdit(member)}
          >
            {isOwnCard(member) && (
              <div className="flex justify-start mb-2">
                <span className="inline-flex items-center gap-1 text-xs text-gold font-body">
                  <Pencil className="h-3 w-3" /> לחץ לעריכה
                </span>
              </div>
            )}
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
                  <a href={`https://wa.me/${member.phone.replace(/[^0-9]/g, '').replace(/^0/, '972')}`} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-foreground hover:text-gold transition-colors" dir="ltr" onClick={(e) => e.stopPropagation()}>
                    {member.phone}
                  </a>
                </div>
              )}
              {member.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gold" />
                  <span className="font-body text-sm text-muted-foreground">{member.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {members.length === 0 && <p className="font-body text-muted-foreground">אין חברים מאושרים עדיין.</p>}
    </div>

    {/* Edit Profile Dialog */}
    <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">עריכת <span className="text-gold">הכרטיסיה שלך</span></DialogTitle>
          <DialogDescription className="sr-only">עריכת פרטי הכרטיסיה שלך</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {editMember && currentUserId && (
            <div className="flex justify-center">
              <AvatarUpload
                userId={currentUserId}
                currentUrl={editMember.avatar_url}
                onUpload={(url) => {
                  setEditMember((prev: any) => prev ? { ...prev, avatar_url: url } : prev);
                  fetchMembers();
                }}
                size="lg"
              />
            </div>
          )}
          <div>
            <Label className="font-body text-sm">שם מלא</Label>
            <Input value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} autoComplete="off" />
          </div>
          <div>
            <Label className="font-body text-sm">מקצוע</Label>
            <Input value={editForm.profession} onChange={(e) => setEditForm(f => ({ ...f, profession: e.target.value }))} autoComplete="off" />
          </div>
          <div>
            <Label className="font-body text-sm">מומחיות</Label>
            <Input value={editForm.expertise} onChange={(e) => setEditForm(f => ({ ...f, expertise: e.target.value }))} autoComplete="off" />
          </div>
          <div>
            <Label className="font-body text-sm">ביוגרפיה קצרה</Label>
            <Textarea value={editForm.bio} onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))} rows={3} autoComplete="off" />
          </div>
          <div>
            <Label className="font-body text-sm">טלפון</Label>
            <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" autoComplete="off" />
          </div>
          <div>
            <Label className="font-body text-sm">כתובת</Label>
            <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} autoComplete="off" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full gradient-gold text-primary-foreground font-body">
            {saving ? "שומר..." : "עדכן כרטיסיה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default Members;
