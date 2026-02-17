import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "שם חייב להכיל לפחות 2 תווים").max(100, "שם ארוך מדי"),
  phone: z.string().trim().min(9, "מספר טלפון לא תקין").max(15, "מספר טלפון לא תקין").regex(/^[\d\-+() ]+$/, "מספר טלפון לא תקין"),
  address: z.string().trim().min(3, "כתובת חייבת להכיל לפחות 3 תווים").max(200, "כתובת ארוכה מדי"),
  profession: z.string().trim().min(2, "מקצוע חייב להכיל לפחות 2 תווים").max(100, "מקצוע ארוך מדי"),
  expertise: z.string().max(200, "מומחיות ארוכה מדי").optional().or(z.literal("")),
  bio: z.string().max(500, "ביוגרפיה ארוכה מדי").optional().or(z.literal("")),
  email: z.string().trim().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "סיסמה חייבת להכיל לפחות 6 תווים").max(72, "סיסמה ארוכה מדי"),
});

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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
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
      const { error } = await supabase.auth.signUp({
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
          },
        },
      });

      if (error) throw error;

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

  const Field = ({ name, label, required = false, ...props }: any) => (
    <div>
      <label className="mb-1.5 block font-body text-sm text-muted-foreground">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {props.textarea ? (
        <Textarea
          name={name}
          value={(form as any)[name]}
          onChange={handleChange}
          className={`bg-card border-border ${errors[name] ? "border-destructive" : ""}`}
          {...props}
          textarea={undefined}
        />
      ) : (
        <Input
          name={name}
          value={(form as any)[name]}
          onChange={handleChange}
          className={`bg-card border-border ${errors[name] ? "border-destructive" : ""}`}
          {...props}
        />
      )}
      {errors[name] && <p className="mt-1 font-body text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              הגברים של <span className="text-gold">ק. קריניצי</span>
            </h1>
          </Link>
          <p className="mt-3 font-body text-muted-foreground">בקשת הצטרפות למועדון</p>
          <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="full_name" label="שם מלא" required />
            <Field name="phone" label="מספר טלפון" required dir="ltr" />
          </div>

          <Field name="address" label="כתובת מגורים (רחוב ומספר)" required />

          <div className="grid gap-4 md:grid-cols-2">
            <Field name="profession" label="מקצוע" required />
            <Field name="expertise" label="מומחיות" placeholder="למשל: מומחה ליין, טכנולוגיה..." />
          </div>

          <Field name="bio" label="משהו שהשכנים צריכים לדעת עליך" textarea placeholder="ביוגרפיה קצרה..." />

          <div className="border-t border-border pt-5 space-y-4">
            <Field name="email" label="אימייל" required type="email" dir="ltr" />
            <Field name="password" label="סיסמה" required type="password" dir="ltr" />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
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
