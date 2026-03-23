import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Briefcase, MapPin, Pencil, Search, Cake, Send, Heart, MessageCircle, Calendar } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import QuoteSection from "@/components/landing/QuoteSection";
import heroImg from "@/assets/hero-members.jpg";
import { usePageCover } from "@/hooks/usePageCover";
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

const HOBBY_OPTIONS = ["ספורט", "בישול", "טכנולוגיה", "מוזיקה", "נסיעות", "קריאה", "גיימינג", "אומנות", "צילום", "גינון"];

const Members = () => {
  const [members, setMembers] = useState<any[]>([]);
  const coverImage = usePageCover("members", heroImg);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<any | null>(null);
  const [viewMember, setViewMember] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", profession: "", expertise: "", bio: "", phone: "", address: "", birth_date: "", hobbies: "" });
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterProfession, setFilterProfession] = useState("all");
  const [filterHobby, setFilterHobby] = useState("all");
  const gridRef = useRef<HTMLDivElement>(null);
  const viewModalRef = useRef<HTMLDivElement>(null);

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

  // Animate view modal
  useEffect(() => {
    if (viewMember && viewModalRef.current) {
      gsap.fromTo(viewModalRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.5)" });
    }
  }, [viewMember]);

  const openEdit = (member: any) => {
    setEditMember(member);
    setEditForm({
      full_name: member.full_name || "",
      profession: member.profession || "",
      expertise: member.expertise || "",
      bio: member.bio || "",
      phone: member.phone || "",
      address: member.address || "",
      birth_date: member.birth_date || "",
      hobbies: member.hobbies || "",
    });
  };

  const handleCardClick = (member: any) => {
    if (isOwnCard(member)) {
      openEdit(member);
    } else {
      setViewMember(member);
    }
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
      birth_date: editForm.birth_date || null,
      hobbies: editForm.hobbies || null,
    } as any).eq("id", editMember.id);
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

  const handleWhatsApp = (member: any) => {
    if (!member.phone) return;
    const cleanPhone = member.phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    const msg = encodeURIComponent(`היי ${member.full_name}, אני חבר במועדון הגברים של קרניצי. מה שלומך?`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  const liveAvatarUrl = editMember?.avatar_url || null;

  const filtered = members.filter((m) => {
    if (filterProfession !== "all" && m.profession !== filterProfession) return false;
    if (filterHobby !== "all") {
      const hobbies = (m.hobbies || "").toLowerCase();
      if (!hobbies.includes(filterHobby.toLowerCase())) return false;
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      if (
        !(m.full_name || "").toLowerCase().includes(q) &&
        !(m.profession || "").toLowerCase().includes(q) &&
        !(m.expertise || "").toLowerCase().includes(q) &&
        !(m.address || "").toLowerCase().includes(q) &&
        !(m.hobbies || "").toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // Extract unique hobbies from all members
  const allHobbies = [...new Set(
    members
      .map(m => (m.hobbies || "").split(/[,،]/).map((h: string) => h.trim()).filter(Boolean))
      .flat()
  )].sort();

  return (
    <>
    <PageHero image={coverImage} title="אינדקס" highlight="החברים" subtitle="אנשי המקצוע והעשייה של השכונה — הכירו את חברי המועדון" />
    
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
          אינדקס <span className="text-gold">החברים</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">אנשי המקצוע של השכונה</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Input placeholder="חיפוש לפי שם, מקצוע, תחביב..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="bg-background w-48 sm:w-64 h-9 font-body text-sm" autoComplete="off" />
        <Select value={filterProfession} onValueChange={setFilterProfession}>
          <SelectTrigger className="bg-background font-body w-36 h-9 text-sm"><SelectValue placeholder="מקצוע" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המקצועות</SelectItem>
            {[...new Set(members.map(m => m.profession).filter(Boolean))].sort().map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allHobbies.length > 0 && (
          <Select value={filterHobby} onValueChange={setFilterHobby}>
            <SelectTrigger className="bg-background font-body w-36 h-9 text-sm"><SelectValue placeholder="תחביב" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל התחביבים</SelectItem>
              {allHobbies.map(h => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid gap-3 grid-cols-1 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {filtered.map((member) => {
          const birthdayToday = isBirthdayToday(member.birth_date);
          return (
            <div
              key={member.id}
              className={`member-card cursor-pointer rounded-lg border bg-card p-4 sm:p-6 transition-all hover:border-gold/20 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)] ${isOwnCard(member) ? "ring-1 ring-gold/30" : "border-border"} ${birthdayToday ? "border-gold/40 shadow-[0_0_20px_hsl(43_72%_52%/0.12)]" : ""}`}
              onClick={() => handleCardClick(member)}
            >
              {isOwnCard(member) && (
                <div className="flex justify-start mb-2">
                  <span className="inline-flex items-center gap-1 text-xs text-gold font-body">
                    <Pencil className="h-3 w-3" /> לחץ לעריכה
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 mb-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary border border-gold/20">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.full_name} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-foreground truncate">{member.full_name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-3 w-3 text-gold" />
                    <span className="font-body text-sm text-gold">{member.profession}</span>
                  </div>
                </div>
              </div>

              {/* Birthday badge */}
              {member.birth_date && (
                <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-body mb-2 ${birthdayToday ? "bg-gold/15 text-gold border border-gold/30 animate-pulse" : "bg-secondary text-muted-foreground"}`}>
                  <Cake className={`h-3 w-3 ${birthdayToday ? "text-gold" : ""}`} />
                  {birthdayToday ? "🎂 חוגג היום!" : formatHebrewDate(member.birth_date)}
                </div>
              )}

              {member.expertise && (
                <p className="font-body text-xs text-muted-foreground mb-2">
                  <span className="text-gold">מומחיות:</span> {member.expertise}
                </p>
              )}

              {member.bio && (
                <p className="font-body text-xs text-muted-foreground italic leading-relaxed mb-3 line-clamp-2">"{member.bio}"</p>
              )}

              {member.hobbies && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {member.hobbies.split(/[,،]/).filter(Boolean).slice(0, 3).map((h: string, i: number) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-body text-[10px] text-muted-foreground">
                      <Heart className="h-2.5 w-2.5 text-gold" />
                      {h.trim()}
                    </span>
                  ))}
                </div>
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
              </div>
            </div>
          );
        })}
      </div>
      {members.length === 0 && <p className="font-body text-muted-foreground">אין חברים מאושרים עדיין.</p>}
    </div>

    {/* View Member Modal (non-own cards) */}
    <Dialog open={!!viewMember} onOpenChange={(open) => !open && setViewMember(null)}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-card/95 border-gold/20" dir="rtl">
        <div ref={viewModalRef}>
          <DialogHeader className="sr-only">
            <DialogTitle>{viewMember?.full_name}</DialogTitle>
            <DialogDescription>פרטי חבר מועדון</DialogDescription>
          </DialogHeader>

          <div className="text-center mb-5">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-secondary border-2 border-gold/30 overflow-hidden flex items-center justify-center">
              {viewMember?.avatar_url ? (
                <img src={viewMember.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-gold" />
              )}
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground">{viewMember?.full_name}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Briefcase className="h-3.5 w-3.5 text-gold" />
              <span className="font-body text-sm text-gold">{viewMember?.profession}</span>
            </div>
            {viewMember?.birth_date && isBirthdayToday(viewMember.birth_date) && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-xs font-body text-gold">
                <Cake className="h-3.5 w-3.5" />
                🎂 חוגג/ת יום הולדת היום!
              </div>
            )}
          </div>

          <div className="space-y-3">
            {viewMember?.expertise && (
              <div className="flex items-start gap-2">
                <Briefcase className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                <p className="font-body text-sm text-muted-foreground"><span className="text-gold">מומחיות:</span> {viewMember.expertise}</p>
              </div>
            )}
            {viewMember?.bio && (
              <p className="font-body text-sm text-muted-foreground italic">"{viewMember.bio}"</p>
            )}
            {viewMember?.birth_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gold flex-shrink-0" />
                <span className="font-body text-sm text-muted-foreground">{formatHebrewDate(viewMember.birth_date)}</span>
              </div>
            )}
            {viewMember?.hobbies && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {viewMember.hobbies.split(/[,،]/).filter(Boolean).map((h: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary border border-border px-2.5 py-1 font-body text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 text-gold" />
                    {h.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="mt-6 flex gap-2">
            {viewMember?.phone && (
              <Button
                onClick={() => handleWhatsApp(viewMember)}
                className="flex-1 gradient-gold text-primary-foreground font-body gap-1.5"
              >
                <MessageCircle className="h-4 w-4" />
                וואטסאפ
              </Button>
            )}
            {viewMember?.phone && (
              <Button
                variant="outline"
                onClick={() => window.open(`tel:${viewMember.phone}`, "_self")}
                className="border-gold/30 text-gold hover:bg-gold/10 font-body gap-1.5"
              >
                <Phone className="h-4 w-4" />
                חייג
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Edit Profile Dialog — 2-column layout */}
    <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">עריכת <span className="text-gold">הכרטיסיה שלך</span></DialogTitle>
          <DialogDescription className="sr-only">עריכת פרטי הכרטיסיה שלך</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          {/* Right column — Form */}
          <div className="space-y-4 order-2 sm:order-1">
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
              <Label className="font-body text-sm">תחביבים</Label>
              <Input value={editForm.hobbies} onChange={(e) => setEditForm(f => ({ ...f, hobbies: e.target.value }))} placeholder="למשל: ספורט, בישול, טכנולוגיה..." autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-sm">טלפון</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} dir="ltr" autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-sm">כתובת</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-sm">תאריך לידה</Label>
              <Input type="date" value={editForm.birth_date} onChange={(e) => setEditForm(f => ({ ...f, birth_date: e.target.value }))} dir="ltr" autoComplete="off" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-gold text-primary-foreground font-body">
              {saving ? "שומר..." : "עדכן כרטיסיה"}
            </Button>
          </div>

          {/* Left column — Live preview card */}
          <div className="order-1 sm:order-2 flex flex-col items-center gap-4">
            {editMember && currentUserId && (
              <AvatarUpload
                userId={currentUserId}
                currentUrl={editMember.avatar_url}
                onUpload={(url) => {
                  setEditMember((prev: any) => prev ? { ...prev, avatar_url: url } : prev);
                  fetchMembers();
                }}
                size="lg"
              />
            )}
            <span className="text-xs text-muted-foreground font-body">לחץ על התמונה כדי לשנות</span>

            {/* Live preview card */}
            <div className="w-full rounded-lg border border-gold/20 bg-card p-5 glow-gold">
              <p className="font-body text-xs text-gold/70 mb-3 text-center">תצוגה מקדימה</p>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary border border-gold/20 overflow-hidden">
                  {liveAvatarUrl ? (
                    <img src={liveAvatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-gold" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-foreground">{editForm.full_name || "שם מלא"}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Briefcase className="h-3 w-3 text-gold" />
                    <span className="font-body text-sm text-gold">{editForm.profession || "מקצוע"}</span>
                  </div>
                </div>
              </div>
              {editForm.expertise && (
                <p className="font-body text-xs text-muted-foreground mb-2">
                  <span className="text-gold">מומחיות:</span> {editForm.expertise}
                </p>
              )}
              {editForm.bio && (
                <p className="font-body text-xs text-muted-foreground italic leading-relaxed mb-3">"{editForm.bio}"</p>
              )}
              {editForm.hobbies && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {editForm.hobbies.split(/[,،]/).filter(Boolean).map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-body text-[10px] text-muted-foreground">
                      <Heart className="h-2.5 w-2.5 text-gold" />
                      {h.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="border-t border-border pt-3 space-y-1.5">
                {editForm.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gold" />
                    <span className="font-body text-sm text-foreground" dir="ltr">{editForm.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <QuoteSection page="members" />
    </>
  );
};

export default Members;
