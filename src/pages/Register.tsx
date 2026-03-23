import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sendTelegramNotification } from "@/lib/telegram-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import HebrewDatePicker from "@/components/HebrewDatePicker";
import { cn } from "@/lib/utils";
import RegisterBackground from "@/components/register/RegisterBackground";

const registerSchema = z.object({
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
  email: z.string().trim().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים").max(72, "סיסמה ארוכה מדי"),
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    email: "",
    password: "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: form.full_name,
            address: form.address,
            phone: form.phone,
            profession: form.profession,
            expertise: form.expertise,
            bio: form.bio,
            birth_date: form.birth_date,
            hobbies: form.hobbies,
            website_url: form.website_url,
            facebook_url: form.facebook_url,
            instagram_url: form.instagram_url,
            linkedin_url: form.linkedin_url,
          },
        },
      });

      if (error) throw error;

      sendTelegramNotification("new_member", {
        name: form.full_name,
        phone: form.phone,
        address: form.address,
        profession: form.profession,
        email: form.email,
        user_id: signUpData.user?.id,
      });

      toast({
        title: "בקשתך נשלחה",
        description: "אנא אשר את כתובת האימייל שלך. תקבל הודעה ברגע שהגישה תאושר.",
      });
      navigate("/pending");
    } catch (error: any) {
      const msg = error.message === "User already registered"
        ? "כתובת אימייל זו כבר רשומה במערכת. נסה להתחבר."
        : error.message;
      toast({
        title: "שגיאה ברישום",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fieldProps = { form, errors, onChange: handleChange };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <RegisterBackground />

      <div className="w-full max-w-lg rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-4xl font-bold text-foreground drop-shadow-md">
              הגברים של <span className="text-gold">ק. קריניצי</span>
            </h1>
          </Link>
          <p className="mt-3 font-body text-lg text-muted-foreground">בקשת הצטרפות למועדון</p>
          <div className="mt-4 mx-auto h-0.5 w-16 gradient-gold opacity-60 rounded-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate autoComplete="off">
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="full_name" label="שם מלא" required {...fieldProps} />
            <Field name="phone" label="מספר טלפון" required dir="ltr" {...fieldProps} />
          </div>

          <Field name="address" label="כתובת מגורים (רחוב ומספר)" required {...fieldProps} />

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="profession" label="מקצוע" required {...fieldProps} />
            <Field name="expertise" label="מומחיות" placeholder="למשל: מומחה ליין, טכנולוגיה..." {...fieldProps} />
          </div>

          {/* Date of birth picker */}
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
              <Field name="website_url" label="אתר אישי/עסקי" placeholder="https://..." dir="ltr" {...fieldProps} />
              <Field name="facebook_url" label="פייסבוק" placeholder="https://facebook.com/..." dir="ltr" {...fieldProps} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field name="instagram_url" label="אינסטגרם" placeholder="https://instagram.com/..." dir="ltr" {...fieldProps} />
              <Field name="linkedin_url" label="לינקדאין" placeholder="https://linkedin.com/in/..." dir="ltr" {...fieldProps} />
            </div>
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <Field name="email" label="אימייל" required type="email" dir="ltr" {...fieldProps} />
            <Field name="password" label="סיסמה" required type="password" dir="ltr" {...fieldProps} />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90 hover:scale-[1.02] transition-all duration-300 shadow-lg">
            {loading ? "שולח בקשה..." : "שלח בקשת הצטרפות"}
          </Button>

          <p className="text-center font-body text-sm text-muted-foreground">
            כבר חבר?{" "}
            <Link to="/login" className="text-gold hover:underline">כניסה למועדון</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
