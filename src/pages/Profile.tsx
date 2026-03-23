import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "@/components/AvatarUpload";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import MyPublications from "@/components/profile/MyPublications";

const Profile = () => {
  const { toast } = useToast();
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
      toast({ title: "שגיאה", description: "יש למלא את כל השדות החובה", variant: "destructive" });
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
      toast({ title: "הפרופיל עודכן בהצלחה!" });
    } catch (err: any) {
      toast({ title: "שגיאה בשמירה", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">טוען...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-2">
        <Link to="/dashboard" className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד
        </Link>
      </div>

      <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl mb-8">
        הפרופיל <span className="text-gold">שלי</span>
      </h1>

      <div className="mb-8 flex justify-center">
        <AvatarUpload userId={userId} currentUrl={avatarUrl} onUpload={setAvatarUrl} size="lg" />
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">שם מלא <span className="text-gold">*</span></label>
            <Input name="full_name" value={form.full_name} onChange={handleChange} className="bg-card border-border" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">טלפון <span className="text-gold">*</span></label>
            <Input name="phone" value={form.phone} onChange={handleChange} className="bg-card border-border" dir="ltr" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">כתובת <span className="text-gold">*</span></label>
          <Input name="address" value={form.address} onChange={handleChange} className="bg-card border-border" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">מקצוע <span className="text-gold">*</span></label>
            <Input name="profession" value={form.profession} onChange={handleChange} className="bg-card border-border" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">מומחיות</label>
            <Input name="expertise" value={form.expertise} onChange={handleChange} className="bg-card border-border" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">ביוגרפיה</label>
          <Textarea name="bio" value={form.bio} onChange={handleChange} className="bg-card border-border min-h-[100px]" placeholder="ספר קצת על עצמך..." />
        </div>

        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">תחביבים</label>
          <Input name="hobbies" value={form.hobbies} onChange={handleChange} className="bg-card border-border" placeholder="למשל: ספורט, בישול, טכנולוגיה..." />
        </div>

        <Separator className="my-4" />
        <p className="font-body text-sm text-muted-foreground mb-2">קישורים חברתיים</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">אתר אישי/עסקי</label>
            <Input name="website_url" value={form.website_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://..." />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">פייסבוק</label>
            <Input name="facebook_url" value={form.facebook_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://facebook.com/..." />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">אינסטגרם</label>
            <Input name="instagram_url" value={form.instagram_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">לינקדאין</label>
            <Input name="linkedin_url" value={form.linkedin_url} onChange={handleChange} className="bg-card border-border" dir="ltr" placeholder="https://linkedin.com/in/..." />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
          {saving ? "שומר..." : "שמור שינויים"}
        </Button>
      </form>

      {/* Password Change Section */}
      <Separator className="my-10" />
      <h2 className="font-serif text-xl font-bold text-foreground mb-6">
        שינוי <span className="text-gold">סיסמה</span>
      </h2>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">סיסמה חדשה</label>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-card border-border pl-10"
              dir="ltr"
              placeholder="לפחות 6 תווים"
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
          <label className="mb-1.5 block font-body text-sm text-muted-foreground">אימות סיסמה חדשה</label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-card border-border pl-10"
              dir="ltr"
              placeholder="הזן שוב את הסיסמה"
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
              toast({ title: "שגיאה", description: "הסיסמה חייבת להכיל לפחות 6 תווים", variant: "destructive" });
              return;
            }
            if (newPassword !== confirmPassword) {
              toast({ title: "שגיאה", description: "הסיסמאות אינן תואמות", variant: "destructive" });
              return;
            }
            setChangingPassword(true);
            try {
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) throw error;
              toast({ title: "הסיסמה שונתה בהצלחה!" });
              setNewPassword("");
              setConfirmPassword("");
            } catch (err: any) {
              toast({ title: "שגיאה בשינוי סיסמה", description: err.message, variant: "destructive" });
            } finally {
              setChangingPassword(false);
            }
          }}
          className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90"
        >
          {changingPassword ? "משנה סיסמה..." : "שנה סיסמה"}
        </Button>
      </div>

      {/* My Publications Section */}
      <Separator className="my-10" />
      <h2 className="font-serif text-xl font-bold text-foreground mb-6">
        הפרסומים <span className="text-gold">שלי</span>
      </h2>
      <MyPublications userId={userId} />
    </div>
  );
};

export default Profile;
