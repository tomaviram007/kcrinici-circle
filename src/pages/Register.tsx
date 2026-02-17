import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        description: "תקבל הודעה במייל ברגע שהגישה תאושר.",
      });
      navigate("/pending");
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              הגברים של <span className="text-gold">ק. קריניצי</span>
            </h1>
          </Link>
          <p className="mt-3 font-body text-muted-foreground">
            בקשת הצטרפות למועדון
          </p>
          <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">שם מלא *</label>
              <Input name="full_name" value={form.full_name} onChange={handleChange} required className="bg-card border-border" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">מספר טלפון *</label>
              <Input name="phone" value={form.phone} onChange={handleChange} required className="bg-card border-border" dir="ltr" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">כתובת מגורים (רחוב ומספר) *</label>
            <Input name="address" value={form.address} onChange={handleChange} required className="bg-card border-border" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">מקצוע *</label>
              <Input name="profession" value={form.profession} onChange={handleChange} required className="bg-card border-border" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">מומחיות</label>
              <Input name="expertise" value={form.expertise} onChange={handleChange} className="bg-card border-border" placeholder="למשל: מומחה ליין, טכנולוגיה..." />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">משהו שהשכנים צריכים לדעת עליך</label>
            <Textarea name="bio" value={form.bio} onChange={handleChange} className="bg-card border-border min-h-[80px]" placeholder="ביוגרפיה קצרה..." />
          </div>

          <div className="border-t border-border pt-5 space-y-4">
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">אימייל *</label>
              <Input name="email" type="email" value={form.email} onChange={handleChange} required className="bg-card border-border" dir="ltr" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">סיסמה *</label>
              <Input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} className="bg-card border-border" dir="ltr" />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
            {loading ? "שולח בקשה..." : "שלח בקשת הצטרפות"}
          </Button>

          <p className="text-center font-body text-sm text-muted-foreground">
            כבר חבר?{" "}
            <Link to="/login" className="text-gold hover:underline">
              כניסה למועדון
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
