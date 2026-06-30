import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "@/components/AvatarUpload";
import { ArrowRight, Eye, EyeOff, Globe, Facebook, Instagram, Linkedin, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import MyPublications from "@/components/profile/MyPublications";
import { useUnreadAnnouncements } from "@/hooks/useUnreadAnnouncements";
import { useLanguage } from "@/contexts/LanguageContext";

const Profile = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    profession: "",
    expertise: "",
    bio: "",
    hobbies: "",
    website_url: "",
    facebook_url: "",
    instagram_url: "",
    linkedin_url: "",
  });

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, address, profession, expertise, bio, avatar_url, hobbies, website_url, facebook_url, instagram_url, linkedin_url")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        setForm({
          full_name: profile.full_name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          profession: profile.profession || "",
          expertise: profile.expertise || "",
          bio: profile.bio || "",
          hobbies: (profile as any).hobbies || "",
          website_url: (profile as any).website_url || "",
          facebook_url: (profile as any).facebook_url || "",
          instagram_url: (profile as any).instagram_url || "",
          linkedin_url: (profile as any).linkedin_url || "",
        });
        setAvatarUrl(profile.avatar_url);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim() || !form.address.trim() || !form.profession.trim()) {
      toast({ title: t("profile.toastError"), description: t("profile.toastRequiredFields"), variant: "destructive" });
      return;
    }
    if (!avatarUrl) {
      toast({ title: t("profile.toastError"), description: "חובה להעלות תמונת פרופיל לפני שמירת הכרטיסיה", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          profession: form.profession.trim(),
          expertise: form.expertise.trim() || null,
          bio: form.bio.trim() || null,
          hobbies: form.hobbies.trim() || null,
          website_url: form.website_url.trim() || null,
          facebook_url: form.facebook_url.trim() || null,
          instagram_url: form.instagram_url.trim() || null,
          linkedin_url: form.linkedin_url.trim() || null,
        } as any)
        .eq("user_id", userId);

      if (error) throw error;
      toast({ title: t("profile.toastSaved") });
    } catch (err: any) {
      toast({ title: t("profile.toastSaveError"), description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const { count: unreadCount, items: unreadItems } = useUnreadAnnouncements(userId || null);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">{t("profile.loading")}</p>
      </div>
    );
  }

  return (
    <div className="page-container py-4 sm:py-8 md:py-12">
      <div className="mb-2">
        <Link to="/dashboard" className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-4 w-4" />
          {t("profile.backToDashboard")}
        </Link>
      </div>

      <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl mb-8">
        {t("profile.title")} <span className="text-gold">{t("profile.highlight")}</span>
      </h1>

      <div className="mb-8 flex justify-center">
        <AvatarUpload userId={userId} currentUrl={avatarUrl} onUpload={setAvatarUrl} size="lg" />
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldFullName")} <span className="text-gold">*</span></label>
            <Input name="full_name" value={form.full_name} onChange={handleChange} className="bg-card border-border" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldPhone")} <span className="text-gold">*</span></label>
            <Input name="phone" value={form.phone} onChange={handleChange} className="bg-card border-border" dir="ltr" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldAddress")} <span className="text-gold">*</span></label>
          <Input name="address" value={form.address} onChange={handleChange} className="bg-card border-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldProfession")} <span className="text-gold">*</span></label>
            <Input name="profession" value={form.profession} onChange={handleChange} className="bg-card border-border" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldExpertise")}</label>
            <Input name="expertise" value={form.expertise} onChange={handleChange} className="bg-card border-border" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldBio")}</label>
          <Textarea name="bio" value={form.bio} onChange={handleChange} className="bg-card border-border min-h-[100px]" placeholder={t("profile.bioPlaceholder")} />
        </div>

        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldHobbies")}</label>
          <Input name="hobbies" value={form.hobbies} onChange={handleChange} className="bg-card border-border" placeholder={t("profile.hobbiesPlaceholder")} />
        </div>

        <Separator className="my-4" />
        <p className="font-body text-sm text-muted-foreground mb-2">{t("profile.socialLinks")}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Globe className="h-3.5 w-3.5 text-gold" /> {t("profile.fieldWebsite")}</label>
            <Input name="website_url" value={form.website_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://..." />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Facebook className="h-3.5 w-3.5 text-[#1877F2]" /> {t("profile.fieldFacebook")}</label>
            <Input name="facebook_url" value={form.facebook_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://facebook.com/..." />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Instagram className="h-3.5 w-3.5 text-[#E4405F]" /> {t("profile.fieldInstagram")}</label>
            <Input name="instagram_url" value={form.instagram_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" /> {t("profile.fieldLinkedin")}</label>
            <Input name="linkedin_url" value={form.linkedin_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://linkedin.com/in/..." />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
          {saving ? t("profile.saving") : t("profile.saveChanges")}
        </Button>
      </form>

      {/* Password Change Section */}
      <Separator className="my-10" />
      <h2 className="font-serif text-xl font-bold text-foreground mb-6">
        {t("profile.changePassword")} <span className="text-gold">{t("profile.changePasswordHighlight")}</span>
      </h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldNewPassword")}</label>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-card border-border pl-10"
              dir="ltr"
              placeholder={t("profile.newPasswordPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">{t("profile.fieldConfirmPassword")}</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-card border-border pl-10"
              dir="ltr"
              placeholder={t("profile.confirmPasswordPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button
          type="button"
          disabled={changingPassword}
          onClick={async () => {
            if (newPassword.length < 6) {
              toast({ title: t("profile.toastError"), description: t("profile.toastPasswordTooShort"), variant: "destructive" });
              return;
            }
            if (newPassword !== confirmPassword) {
              toast({ title: t("profile.toastError"), description: t("profile.toastPasswordMismatch"), variant: "destructive" });
              return;
            }
            setChangingPassword(true);
            try {
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) throw error;
              toast({ title: t("profile.toastPasswordChanged") });
              setNewPassword("");
              setConfirmPassword("");
            } catch (err: any) {
              toast({ title: t("profile.toastPasswordChangeError"), description: err.message, variant: "destructive" });
            } finally {
              setChangingPassword(false);
            }
          }}
          className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90"
        >
          {changingPassword ? t("profile.changingPassword") : t("profile.changePasswordBtn")}
        </Button>
      </div>

      {/* Unread Announcements Section */}
      {unreadCount > 0 && (
        <>
          <Separator className="my-10" />
          <div className="mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-500" />
            <h2 className="font-serif text-xl font-bold text-foreground">
              {t("profile.unreadTitle")} <span className="text-red-500">{t("profile.unreadHighlight")}</span>
            </h2>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
              {unreadCount}
            </span>
          </div>
          <div className="space-y-2">
            {unreadItems.map((item) => (
              <Link
                key={item.id}
                to="/announcements"
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-gold/30 hover:bg-card/80 transition-all"
              >
                <span className="font-body text-sm font-medium text-foreground line-clamp-1">{item.title}</span>
                <span className="font-body text-xs text-muted-foreground shrink-0 mr-3">
                  {new Date(item.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "long" })}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* My Publications Section */}
      <Separator className="my-10" />
      <h2 className="font-serif text-xl font-bold text-foreground mb-6">
        {t("profile.myPublications")} <span className="text-gold">{t("profile.myPublicationsHighlight")}</span>
      </h2>
      <MyPublications userId={userId} />
    </div>
  );
};

export default Profile;
