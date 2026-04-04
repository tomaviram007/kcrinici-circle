import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import { useConfetti } from "@/hooks/useConfetti";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check, X, Clock, Users, Search, Pencil, Trash2, KeyRound, Eye, EyeOff,
  UserX, RotateCcw, Phone, MapPin, Briefcase, Calendar, User, Globe, Facebook, Instagram, Linkedin, Sparkles, Download,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import HebrewDatePicker from "@/components/HebrewDatePicker";
import { cn } from "@/lib/utils";
import gsap from "gsap";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  profession: string;
  expertise: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  is_removed: boolean;
  birth_date: string | null;
  created_at: string;
  hobbies?: string | null;
  website_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  linkedin_url?: string | null;
}

const PROTECTED_ADMIN_ID = "6227d1da-8f99-4b82-bd30-a3dc2e3a3885";

const AdminMembers = () => {
  const { toast } = useToast();
  const { fireMemberApproved } = useConfetti();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberEmails, setMemberEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Edit dialog
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  // Password reset dialog
  const [resetUser, setResetUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail view dialog (Glassmorphism modal)
  const [viewProfile, setViewProfile] = useState<Profile | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const bulkBarRef = useRef<HTMLDivElement>(null);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const allProfiles = (data as Profile[]) || [];
    setProfiles(allProfiles);
    setLoading(false);

    // Email fetching removed – get_user_emails RPC no longer exists
  };

  useEffect(() => {
    fetchProfiles();
    const channel = supabase
      .channel("admin-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchProfiles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Animate bulk bar
  useEffect(() => {
    if (bulkBarRef.current) {
      if (selected.size > 0) {
        gsap.fromTo(bulkBarRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.5)" });
      }
    }
  }, [selected.size > 0]);

  // Animate modal
  useEffect(() => {
    if (viewProfile && modalRef.current) {
      gsap.fromTo(modalRef.current, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "power3.out" });
    }
  }, [viewProfile]);

  const openWhatsApp = (phone: string, message: string) => {
    const clean = phone.replace(/[^0-9]/g, "").replace(/^0/, "972");
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: true, is_removed: false }).eq("user_id", userId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    supabase.functions.invoke("notify-member", { body: { userId, action: "approve" } });
    const profile = profiles.find(p => p.user_id === userId);
    sendTelegramNotification("member_approved", { name: profile?.full_name, phone: profile?.phone, profession: profile?.profession });
    fireMemberApproved();
    toast({ title: "אושר!", description: "החבר אושר בהצלחה." });
    fetchProfiles();
    if (profile?.phone) {
      openWhatsApp(profile.phone, `היי ${profile.full_name}! 🎉 שמחים לבשר לך שבקשת ההצטרפות שלך למועדון קרניצי אושרה. ברוך הבא! 🥂\n\nמעכשיו יש לך גישה מלאה לכל התכנים, ההטבות והקהילה שלנו.\nמחכים לראות אותך בפנים: ${window.location.origin}`);
    }
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: false, is_removed: true }).eq("user_id", userId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    supabase.functions.invoke("notify-member", { body: { userId, action: "reject" } });
    const profile = profiles.find(p => p.user_id === userId);
    toast({ title: "נדחה", description: "הבקשה נדחתה." });
    fetchProfiles();
    if (profile?.phone) {
      openWhatsApp(profile.phone, `היי ${profile.full_name}, לאחר בחינת בקשתך, לצערנו לא נוכל לאשר את הצטרפותך למועדון קרניצי בשלב זה. תודה על ההבנה.`);
    }
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    setBulkProcessing(true);
    const ids = Array.from(selected);
    for (const userId of ids) {
      await supabase.from("profiles").update({ is_approved: true, is_removed: false }).eq("user_id", userId);
      supabase.functions.invoke("notify-member", { body: { userId, action: "approve" } });
      const profile = profiles.find(p => p.user_id === userId);
      if (profile) sendTelegramNotification("member_approved", { name: profile.full_name, phone: profile.phone, profession: profile.profession });
    }
    toast({ title: "אושרו!", description: `${ids.length} חברים אושרו בהצלחה.` });
    setSelected(new Set());
    setBulkProcessing(false);
    fetchProfiles();
  };

  const handleBulkReject = async () => {
    setBulkProcessing(true);
    const ids = Array.from(selected);
    for (const userId of ids) {
      await supabase.from("profiles").update({ is_approved: false }).eq("user_id", userId);
      supabase.functions.invoke("notify-member", { body: { userId, action: "reject" } });
    }
    toast({ title: "נדחו", description: `${ids.length} בקשות נדחו.` });
    setSelected(new Set());
    setBulkProcessing(false);
    fetchProfiles();
  };

  const toggleSelect = (userId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = (pendingList: Profile[]) => {
    if (pendingList.every(p => selected.has(p.user_id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingList.map(p => p.user_id)));
    }
  };

  // Edit
  const openEdit = (p: Profile) => {
    setEditProfile(p);
    setEditForm({ full_name: p.full_name, phone: p.phone, address: p.address, profession: p.profession, expertise: p.expertise, bio: p.bio, birth_date: p.birth_date, website_url: p.website_url, facebook_url: p.facebook_url, instagram_url: p.instagram_url, linkedin_url: p.linkedin_url });
  };

  const handleSaveEdit = async () => {
    if (!editProfile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(editForm).eq("user_id", editProfile.user_id);
    setSaving(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "עודכן!", description: "פרטי החבר עודכנו בהצלחה." });
    setEditProfile(null);
    fetchProfiles();
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    setResetting(true);
    const { error } = await supabase.functions.invoke("notify-member", {
      body: { userId: resetUser.user_id, action: "admin-reset-password", newPassword },
    });
    setResetting(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "סיסמה אופסה!", description: `הסיסמה של ${resetUser.full_name} עודכנה.` });
    setResetUser(null);
    setNewPassword("");
  };

  // Remove member (mark as removed)
  const handleDelete = async () => {
    if (!deleteUser) return;
    if (deleteUser.user_id === PROTECTED_ADMIN_ID) {
      toast({ title: "לא ניתן", description: "לא ניתן להסיר את האדמין הראשי.", variant: "destructive" });
      setDeleteUser(null);
      return;
    }
    setDeleting(true);
    const { error } = await supabase.from("profiles").update({ is_approved: false, is_removed: true }).eq("user_id", deleteUser.user_id);
    setDeleting(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "הוסר", description: `${deleteUser.full_name} הוסר מהמועדון.` });
    setDeleteUser(null);
    fetchProfiles();
  };

  // Restore removed member
  const handleRestore = async (userId: string, name: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: true, is_removed: false }).eq("user_id", userId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "שוחזר!", description: `${name} שוחזר למועדון בהצלחה.` });
    fetchProfiles();
  };

  const filtered = profiles.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.profession.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );
  const pending = filtered.filter((p) => !p.is_approved && !p.is_removed);
  const approved = filtered.filter((p) => p.is_approved && !p.is_removed);
  const removed = filtered.filter((p) => p.is_removed);

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-6">
      {/* Search + Export */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מקצוע או טלפון..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 bg-card"
            autoComplete="off"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 font-body text-xs h-9"
          onClick={() => exportMembersCSV(profiles)}
        >
          <Download className="h-4 w-4" /> ייצוא CSV
        </Button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          ref={bulkBarRef}
          className="sticky top-16 z-30 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/90 backdrop-blur-xl p-3 shadow-lg"
          dir="rtl"
        >
          <span className="font-body text-sm text-foreground">
            <strong>{selected.size}</strong> נבחרו
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkApprove} disabled={bulkProcessing} className="gradient-gold text-primary-foreground font-body text-xs h-8 gap-1">
              <Check className="h-3.5 w-3.5" /> אשר נבחרים
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkReject} disabled={bulkProcessing} className="border-destructive text-destructive font-body text-xs h-8 gap-1">
              <X className="h-3.5 w-3.5" /> דחה נבחרים
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="font-body text-xs h-8 text-muted-foreground">
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Pending */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold" /> ממתינים לאישור ({pending.length})
          </h3>
          {pending.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => toggleSelectAll(pending)} className="font-body text-xs text-muted-foreground">
              {pending.every(p => selected.has(p.user_id)) ? "בטל הכל" : "בחר הכל"}
            </Button>
          )}
        </div>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין בקשות ממתינות.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((p) => (
              <PendingMemberCard
                key={p.id}
                profile={p}
                isSelected={selected.has(p.user_id)}
                onToggleSelect={() => toggleSelect(p.user_id)}
                onApprove={handleApprove}
                onReject={handleReject}
                onView={setViewProfile}
                onEdit={openEdit}
                onResetPassword={setResetUser}
                onDelete={setDeleteUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" /> חברים מאושרים ({approved.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {approved.map((p) => (
            <MemberCard key={p.id} profile={p} onApprove={handleApprove} onReject={handleReject} onEdit={openEdit} onResetPassword={setResetUser} onDelete={setDeleteUser} onView={setViewProfile} />
          ))}
        </div>
      </div>

      {/* Removed */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <UserX className="h-5 w-5 text-destructive" /> חברים שהוסרו ({removed.length})
        </h3>
        {removed.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין חברים שהוסרו.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {removed.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card/50 p-4 space-y-3 opacity-70">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover rounded-full grayscale" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif text-base font-bold text-foreground truncate line-through">{p.full_name}</h4>
                    <p className="font-body text-xs text-muted-foreground truncate">{p.profession}</p>
                    <p className="font-body text-xs text-muted-foreground">{p.phone}</p>
                    {memberEmails[p.user_id] && (
                      <p className="font-body text-xs text-gold/70 truncate" dir="ltr">{memberEmails[p.user_id]}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => handleRestore(p.user_id, p.full_name)} className="gradient-gold text-primary-foreground font-body text-xs h-8">
                    <RotateCcw className="h-3.5 w-3.5 ml-1" /> שחזר חבר
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setViewProfile(p)} className="font-body text-xs h-8 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5 ml-1" /> פרטים
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Glassmorphism Detail Modal */}
      <Dialog open={!!viewProfile} onOpenChange={(o) => !o && setViewProfile(null)}>
        <DialogContent className="max-w-lg border-border/50 bg-card/80 backdrop-blur-2xl shadow-2xl" dir="rtl">
          <div ref={modalRef}>
            <DialogHeader>
              <DialogTitle className="font-serif text-gold flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> פרטי חבר
              </DialogTitle>
              <DialogDescription className="sr-only">צפייה בפרטי החבר</DialogDescription>
            </DialogHeader>
            {viewProfile && (
              <div className="space-y-5 mt-2">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-secondary border-2 border-gold/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                    {viewProfile.avatar_url ? (
                      <img src={viewProfile.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <User className="h-10 w-10 text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl font-bold text-foreground">{viewProfile.full_name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="h-3.5 w-3.5 text-gold" />
                      <span className="font-body text-sm text-gold">{viewProfile.profession}</span>
                    </div>
                    {viewProfile.expertise && (
                      <p className="font-body text-xs text-muted-foreground mt-0.5">מומחיות: {viewProfile.expertise}</p>
                    )}
                  </div>
                </div>

                {viewProfile.bio && (
                  <p className="font-body text-sm text-foreground/70 italic bg-secondary/40 rounded-lg p-3">"{viewProfile.bio}"</p>
                )}

                {/* Contact info */}
                <div className="rounded-lg border border-border/50 bg-background/40 p-4 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-gold" />
                    <span className="font-body text-sm text-foreground" dir="ltr">{viewProfile.phone}</span>
                  </div>
                  {viewProfile.address && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-gold" />
                      <span className="font-body text-sm text-foreground">{viewProfile.address}</span>
                    </div>
                  )}
                  {viewProfile.birth_date && (
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 text-gold" />
                      <span className="font-body text-sm text-foreground">
                        {new Date(viewProfile.birth_date + "T00:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  {viewProfile.hobbies && (
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 text-gold mt-0.5" />
                      <span className="font-body text-sm text-foreground">{viewProfile.hobbies}</span>
                    </div>
                  )}
                </div>

                {/* Social links */}
                {(viewProfile.website_url || viewProfile.facebook_url || viewProfile.instagram_url || viewProfile.linkedin_url) && (
                  <div className="flex gap-2">
                    {viewProfile.website_url && (
                      <a href={viewProfile.website_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border/50 p-2 text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors">
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                    {viewProfile.facebook_url && (
                      <a href={viewProfile.facebook_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border/50 p-2 text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors">
                        <Facebook className="h-4 w-4" />
                      </a>
                    )}
                    {viewProfile.instagram_url && (
                      <a href={viewProfile.instagram_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border/50 p-2 text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors">
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                    {viewProfile.linkedin_url && (
                      <a href={viewProfile.linkedin_url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-border/50 p-2 text-muted-foreground hover:text-gold hover:border-gold/30 transition-colors">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                )}

                <p className="font-body text-xs text-muted-foreground">
                  הצטרף: {new Date(viewProfile.created_at).toLocaleDateString("he-IL")}
                  {viewProfile.is_removed && <span className="text-destructive mr-2">· הוסר</span>}
                  {!viewProfile.is_approved && !viewProfile.is_removed && <span className="text-primary mr-2">· ממתין לאישור</span>}
                </p>

                {/* Quick actions in modal */}
                {!viewProfile.is_approved && !viewProfile.is_removed && (
                  <div className="flex gap-2 pt-2 border-t border-border/50">
                    <Button size="sm" onClick={() => { handleApprove(viewProfile.user_id); setViewProfile(null); }} className="gradient-gold text-primary-foreground font-body flex-1 gap-1">
                      <Check className="h-4 w-4" /> אשר חבר
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { handleReject(viewProfile.user_id); setViewProfile(null); }} className="border-destructive text-destructive font-body flex-1 gap-1">
                      <X className="h-4 w-4" /> דחה
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProfile} onOpenChange={(o) => !o && setEditProfile(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">עריכת פרטי חבר</DialogTitle>
            <DialogDescription className="font-body text-sm text-muted-foreground">
              עריכת פרטים של {editProfile?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="font-body text-sm">שם מלא</Label>
              <Input value={editForm.full_name || ""} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="bg-background" />
            </div>
            <div>
              <Label className="font-body text-sm">טלפון</Label>
              <Input value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-background" dir="ltr" />
            </div>
            <div>
              <Label className="font-body text-sm">כתובת</Label>
              <Input value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-background" />
            </div>
            <div>
              <Label className="font-body text-sm">מקצוע</Label>
              <Input value={editForm.profession || ""} onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })} className="bg-background" />
            </div>
            <div>
              <Label className="font-body text-sm">תחום מומחיות</Label>
              <Input value={editForm.expertise || ""} onChange={(e) => setEditForm({ ...editForm, expertise: e.target.value })} className="bg-background" />
            </div>
            <div>
              <Label className="font-body text-sm">ביוגרפיה</Label>
              <Textarea value={editForm.bio || ""} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} className="bg-background" rows={3} />
            </div>
            <div>
              <Label className="font-body text-sm">תאריך לידה</Label>
              <HebrewDatePicker value={editForm.birth_date || ""} onChange={(val) => setEditForm({ ...editForm, birth_date: val })} />
            </div>
            <div className="border-t border-border pt-3 mt-1">
              <p className="font-body text-xs text-muted-foreground mb-2">קישורים חברתיים</p>
              <div className="space-y-2">
                <Input value={editForm.website_url || ""} onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })} className="bg-background" dir="ltr" placeholder="אתר אישי (https://...)" />
                <Input value={editForm.facebook_url || ""} onChange={(e) => setEditForm({ ...editForm, facebook_url: e.target.value })} className="bg-background" dir="ltr" placeholder="פייסבוק (https://...)" />
                <Input value={editForm.instagram_url || ""} onChange={(e) => setEditForm({ ...editForm, instagram_url: e.target.value })} className="bg-background" dir="ltr" placeholder="אינסטגרם (https://...)" />
                <Input value={editForm.linkedin_url || ""} onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })} className="bg-background" dir="ltr" placeholder="לינקדאין (https://...)" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditProfile(null)} className="font-body">ביטול</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gradient-gold text-primary-foreground font-body">
              {saving ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(o) => { if (!o) { setResetUser(null); setNewPassword(""); } }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-gold">איפוס סיסמה</DialogTitle>
            <DialogDescription className="font-body text-sm text-muted-foreground">
              איפוס סיסמה עבור {resetUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="font-body text-sm">סיסמה חדשה</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-background pl-10"
                dir="ltr"
                placeholder="לפחות 6 תווים"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(""); }} className="font-body">ביטול</Button>
            <Button onClick={handleResetPassword} disabled={resetting || newPassword.length < 6} className="gradient-gold text-primary-foreground font-body">
              {resetting ? "מאפס..." : "אפס סיסמה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">הסרת חבר מהמועדון</AlertDialogTitle>
            <AlertDialogDescription className="font-body">
              האם אתה בטוח שברצונך להסיר את <strong>{deleteUser?.full_name}</strong> מהמועדון? ניתן יהיה לשחזר אותו בהמשך.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="font-body">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground font-body">
              {deleting ? "מסיר..." : "הסר חבר"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Pending member card with checkbox
const PendingMemberCard = ({
  profile: p,
  isSelected,
  onToggleSelect,
  onApprove,
  onReject,
  onView,
  onEdit,
  onResetPassword,
  onDelete,
}: {
  profile: Profile;
  isSelected: boolean;
  onToggleSelect: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (p: Profile) => void;
  onEdit: (p: Profile) => void;
  onResetPassword: (p: Profile) => void;
  onDelete: (p: Profile) => void;
}) => (
  <div className={cn(
    "rounded-lg border bg-card p-4 space-y-3 transition-all duration-200 overflow-hidden",
    isSelected ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.08)]" : "border-border hover:border-gold/30"
  )}>
    <div className="flex items-start gap-3">
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </div>
      <div
        className="h-10 w-10 rounded-full bg-secondary border border-gold/20 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
        onClick={() => onView(p)}
      >
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
        ) : (
          <Users className="h-5 w-5 text-gold" />
        )}
      </div>
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onView(p)}>
        <h4 className="font-serif text-base font-bold text-foreground truncate">{p.full_name}</h4>
        <p className="font-body text-xs text-muted-foreground truncate">
          {p.profession}{p.expertise ? ` · ${p.expertise}` : ""}
        </p>
        <p className="font-body text-xs text-muted-foreground truncate">{p.phone} · {p.address}</p>
      </div>
    </div>
    {p.bio && <p className="font-body text-sm text-foreground/70 italic line-clamp-2 break-words">"{p.bio}"</p>}

    <div className="flex flex-wrap gap-1.5">
      <Button size="sm" onClick={() => onApprove(p.user_id)} className="gradient-gold text-primary-foreground font-body text-xs h-8">
        <Check className="h-3.5 w-3.5 ml-1" /> אשר
      </Button>
      <Button size="sm" variant="outline" onClick={() => onReject(p.user_id)} className="border-destructive text-destructive font-body text-xs h-8">
        <X className="h-3.5 w-3.5 ml-1" /> דחה
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onEdit(p)} className="font-body text-xs h-8 text-muted-foreground hover:text-foreground">
        <Pencil className="h-3.5 w-3.5 ml-1" /> ערוך
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onResetPassword(p)} className="font-body text-xs h-8 text-muted-foreground hover:text-foreground">
        <KeyRound className="h-3.5 w-3.5 ml-1" /> סיסמה
      </Button>
      {p.user_id !== PROTECTED_ADMIN_ID && (
        <Button size="sm" variant="ghost" onClick={() => onDelete(p)} className="font-body text-xs h-8 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5 ml-1" /> הסר
        </Button>
      )}
    </div>
  </div>
);

// Reusable member card for approved members
const MemberCard = ({
  profile: p,
  isPending,
  onApprove,
  onReject,
  onEdit,
  onResetPassword,
  onDelete,
  onView,
}: {
  profile: Profile;
  isPending?: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (p: Profile) => void;
  onResetPassword: (p: Profile) => void;
  onDelete: (p: Profile) => void;
  onView?: (p: Profile) => void;
}) => (
  <div
    className={`rounded-lg border border-border bg-card p-4 space-y-3 overflow-hidden ${onView && !isPending ? "cursor-pointer hover:border-gold/30 transition-colors" : ""}`}
    onClick={() => onView && !isPending && onView(p)}
  >
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-secondary border border-gold/20 flex items-center justify-center overflow-hidden shrink-0">
        {p.avatar_url ? (
          <img src={p.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
        ) : (
          <Users className="h-5 w-5 text-gold" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-serif text-base font-bold text-foreground truncate">{p.full_name}</h4>
        <p className="font-body text-xs text-muted-foreground truncate">
          {p.profession}{p.expertise ? ` · ${p.expertise}` : ""}
        </p>
        <p className="font-body text-xs text-muted-foreground truncate">{p.phone} · {p.address}</p>
      </div>
    </div>
    {p.bio && <p className="font-body text-sm text-foreground/70 italic line-clamp-2 break-words">"{p.bio}"</p>}

    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
      {isPending && (
        <>
          <Button size="sm" onClick={() => onApprove(p.user_id)} className="gradient-gold text-primary-foreground font-body text-xs h-8">
            <Check className="h-3.5 w-3.5 ml-1" /> אשר
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(p.user_id)} className="border-destructive text-destructive font-body text-xs h-8">
            <X className="h-3.5 w-3.5 ml-1" /> דחה
          </Button>
        </>
      )}
      <Button size="sm" variant="ghost" onClick={() => onEdit(p)} className="font-body text-xs h-8 text-muted-foreground hover:text-foreground">
        <Pencil className="h-3.5 w-3.5 ml-1" /> ערוך
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onResetPassword(p)} className="font-body text-xs h-8 text-muted-foreground hover:text-foreground">
        <KeyRound className="h-3.5 w-3.5 ml-1" /> סיסמה
      </Button>
      {p.user_id !== PROTECTED_ADMIN_ID && (
        <Button size="sm" variant="ghost" onClick={() => onDelete(p)} className="font-body text-xs h-8 text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5 ml-1" /> הסר
        </Button>
      )}
    </div>
  </div>
);

export default AdminMembers;
