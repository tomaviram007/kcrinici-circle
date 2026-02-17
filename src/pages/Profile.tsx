import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "@/components/AvatarUpload";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, address, profession, expertise, bio, avatar_url")
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
        })
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

        <Button type="submit" disabled={saving} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
          {saving ? "שומר..." : "שמור שינויים"}
        </Button>
      </form>
    </div>
  );
};

export default Profile;
