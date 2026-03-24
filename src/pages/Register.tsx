import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import { Globe, Facebook, Instagram, Linkedin, UserPlus, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import HebrewDatePicker from "@/components/HebrewDatePicker";
import RegisterBackground from "@/components/register/RegisterBackground";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "שם חייב להכיל לפחות 2 תווים").max(100, "שם ארוך מדי"),
  phone: z.string().trim().min(9, "מספר טלפון לא תקין").max(15, "מספר טלפון לא תקין").regex(/^[\d\-+() ]+$/, "מספר טלפון לא תקין"),
  address: z.string().trim().min(3, "כתובת חייבת להכיל לפחות 3 תווים").max(200, "כתובת ארוכה מדי"),
  profession: z.string().trim().min(2, "מקצוע חייב להכיל לפחות 2 תווים").max(100, "מקצוע ארוך מדי"),
  expertise: z.string().max(200, "מומחיות ארוכה מדי").optional().or(z.literal("")),
  bio: z.string().max(500, "ביוגרפיה ארוכה מדי").optional().or(z.literal("")),
  hobbies: z.string().max(300, "תחביבים ארוכים מדי").optional().or(z.literal("")),
  website_url: z.string().url("כתובת URL לא תקינה").optional().or(z.literal("")),
  facebook_url: z.string().url("כתובת URL לא תקינה").optional().or(z.literal("")),
  instagram_url: z.string().url("כתובת URL לא תקינה").optional().or(z.literal("")),
  linkedin_url: z.string().url("כתובת URL לא תקינה").optional().or(z.literal("")),
  birth_date: z.string().min(1, "יש לבחור תאריך לידה"),
});

interface FieldProps {
  name: string;
  label: string;
  required?: boolean;
  textarea?: boolean;
  form: Record<string, string>;
  errors: Record<string, string>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  [key: string]: any;
}

const Field = ({ name, label, required = false, textarea, form, errors, onChange, ...props }: FieldProps) => (
  <div>
    <label className="mb-1.5 block font-body text-sm text-muted-foreground">
      {label} {required && <span className="text-gold">*</span>}
    </label>
    {textarea ? (
      <Textarea
        name={name}
        value={form[name]}
        onChange={onChange}
        autoComplete="off"
        className={`bg-card border-border ${errors[name] ? "border-destructive" : ""}`}
        {...props}
      />
    ) : (
      <Input
        name={name}
        value={form[name]}
        onChange={onChange}
        autoComplete="off"
        className={`bg-card border-border ${errors[name] ? "border-destructive" : ""}`}
        {...props}
      />
    )}
    {errors[name] && <p className="mt-1 font-body text-xs text-destructive">{errors[name]}</p>}
  </div>
);

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isApproved, loading: authLoading } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  // Step 2 form (profile completion)
  const [form, setForm] = useState({
    full_name: "",
    address: "",
    phone: "",
    profession: "",
    expertise: "",
    bio: "",
    birth_date: "",
    hobbies: "",
    website_url: "",
    facebook_url: "",
    instagram_url: "",
    linkedin_url: "",
  });

  // If user is already approved, redirect to home
  useEffect(() => {
    if (!authLoading && user && isApproved) {
      navigate("/", { replace: true });
    }
  }, [authLoading, user, isApproved, navigate]);

  // Check if user already has a profile
  useEffect(() => {
    if (!user) {
      setHasProfile(null);
      return;
    }
    const checkProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      setHasProfile(!!data);

      // Pre-fill name from Google account
      if (!data && user.user_metadata?.full_name) {
        setForm(prev => ({ ...prev, full_name: user.user_metadata.full_name || "" }));
      }
    };
    checkProfile();
  }, [user]);

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/register",
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "שגיאה בחיבור עם Google", description: error.message, variant: "destructive" });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = profileSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!user) return;

    setProfileLoading(true);
    try {
      // Upsert profile
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        full_name: form.full_name,
        address: form.address,
        phone: form.phone,
        profession: form.profession,
        expertise: form.expertise || null,
        bio: form.bio || null,
        birth_date: form.birth_date || null,
        hobbies: form.hobbies || null,
        website_url: form.website_url || null,
        facebook_url: form.facebook_url || null,
        instagram_url: form.instagram_url || null,
        linkedin_url: form.linkedin_url || null,
      }, { onConflict: "user_id" });

      if (error) throw error;

      sendTelegramNotification("new_member", {
        name: form.full_name,
        phone: form.phone,
        address: form.address,
        profession: form.profession,
        email: user.email,
        user_id: user.id,
      });

      toast({
        title: "פרטיך נשמרו בהצלחה",
        description: "בקשתך נשלחה להנהלת המועדון. תקבל הודעה ברגע שהגישה תאושר.",
      });
      navigate("/pending");
    } catch (error: any) {
      toast({
        title: "שגיאה בשמירת הפרטים",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Show loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-gold" />
          <p className="font-body text-sm text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  const fieldProps = { form, errors, onChange: handleChange };

  // Step 1: Not logged in — show Google signup
  if (!user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4">
        <RegisterBackground />

        <div className="w-full max-w-sm text-center" dir="rtl">
          <div className="mb-10">
            <Link to="/" className="inline-block">
              <h1 className="font-serif text-3xl font-bold text-foreground drop-shadow-md">
                הגברים של <span className="text-gold">ק. קריניצי</span>
              </h1>
            </Link>
            <p className="mt-3 font-body text-lg text-muted-foreground">הצטרפות למועדון</p>
            <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
          </div>

          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-md p-8 sm:p-10 space-y-6 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-background">
              <UserPlus className="h-7 w-7 text-gold" />
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 shrink-0 text-gold/70" />
              <p className="font-body text-sm leading-relaxed">
                ההרשמה מתבצעת באמצעות חשבון Google בלבד לשמירה על אבטחה ונוחות.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full font-body py-7 text-base gap-3 bg-card hover:bg-secondary border border-border text-foreground shadow-lg shadow-gold/5 hover:shadow-gold/10 transition-all duration-300"
              variant="outline"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "מתחבר..." : "הרשמה עם Google"}
            </Button>
          </div>

          <p className="mt-8 font-body text-sm text-muted-foreground">
            כבר חבר?{" "}
            <Link to="/login" className="text-gold hover:underline">כניסה למועדון</Link>
          </p>
        </div>
      </div>
    );
  }

  // User already has a profile — redirect to pending
  if (hasProfile) {
    navigate("/pending", { replace: true });
    return null;
  }

  // Step 2: Logged in but no profile — show profile form
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <RegisterBackground />

      <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-md animate-fade-in" dir="rtl">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-3xl font-bold text-foreground drop-shadow-md">
              הגברים של <span className="text-gold">ק. קריניצי</span>
            </h1>
          </Link>
          <p className="mt-3 font-body text-muted-foreground">השלמת פרטים</p>
          <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
          <p className="mt-3 font-body text-sm text-muted-foreground/70">
            מחובר כ-{user.email}
          </p>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-5" noValidate autoComplete="off">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="full_name" label="שם מלא" required {...fieldProps} />
            <Field name="phone" label="מספר טלפון" required dir="ltr" {...fieldProps} />
          </div>

          <Field name="address" label="כתובת מגורים (רחוב ומספר)" required {...fieldProps} />

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="profession" label="מקצוע" required {...fieldProps} />
            <Field name="expertise" label="מומחיות" placeholder="למשל: מומחה ליין, טכנולוגיה..." {...fieldProps} />
          </div>

          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">
              תאריך לידה <span className="text-gold">*</span>
            </label>
            <HebrewDatePicker
              value={form.birth_date}
              onChange={(val) => {
                setForm((prev) => ({ ...prev, birth_date: val }));
                if (errors.birth_date) {
                  setErrors((prev) => { const n = { ...prev }; delete n.birth_date; return n; });
                }
              }}
              error={!!errors.birth_date}
            />
            {errors.birth_date && <p className="mt-1 font-body text-xs text-destructive">{errors.birth_date}</p>}
          </div>

          <Field name="bio" label="משהו שהשכנים צריכים לדעת עליך" textarea placeholder="ביוגרפיה קצרה..." {...fieldProps} />
          <Field name="hobbies" label="מה התחביבים שלך?" placeholder="למשל: ספורט, בישול, טכנולוגיה..." {...fieldProps} />

          <div className="border-t border-border pt-5 space-y-4">
            <p className="font-body text-sm text-muted-foreground">קישורים חברתיים (אופציונלי)</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Globe className="h-3.5 w-3.5 text-gold" /> אתר אישי/עסקי</label>
                <Input name="website_url" value={form.website_url} onChange={handleChange} className={`bg-card border-border ${errors.website_url ? "border-destructive" : ""}`} dir="ltr" placeholder="https://..." autoComplete="off" />
                {errors.website_url && <p className="mt-1 font-body text-xs text-destructive">{errors.website_url}</p>}
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Facebook className="h-3.5 w-3.5 text-[#1877F2]" /> פייסבוק</label>
                <Input name="facebook_url" value={form.facebook_url} onChange={handleChange} className={`bg-card border-border ${errors.facebook_url ? "border-destructive" : ""}`} dir="ltr" placeholder="https://facebook.com/..." autoComplete="off" />
                {errors.facebook_url && <p className="mt-1 font-body text-xs text-destructive">{errors.facebook_url}</p>}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Instagram className="h-3.5 w-3.5 text-[#E4405F]" /> אינסטגרם</label>
                <Input name="instagram_url" value={form.instagram_url} onChange={handleChange} className={`bg-card border-border ${errors.instagram_url ? "border-destructive" : ""}`} dir="ltr" placeholder="https://instagram.com/..." autoComplete="off" />
                {errors.instagram_url && <p className="mt-1 font-body text-xs text-destructive">{errors.instagram_url}</p>}
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-body text-sm text-muted-foreground"><Linkedin className="h-3.5 w-3.5 text-[#0A66C2]" /> לינקדאין</label>
                <Input name="linkedin_url" value={form.linkedin_url} onChange={handleChange} className={`bg-card border-border ${errors.linkedin_url ? "border-destructive" : ""}`} dir="ltr" placeholder="https://linkedin.com/in/..." autoComplete="off" />
                {errors.linkedin_url && <p className="mt-1 font-body text-xs text-destructive">{errors.linkedin_url}</p>}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={profileLoading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90 hover:scale-[1.02] transition-all duration-300 shadow-lg">
            {profileLoading ? "שולח בקשה..." : "שלח בקשת הצטרפות"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Register;
