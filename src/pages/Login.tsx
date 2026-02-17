import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "שגיאה בכניסה",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              הגברים של <span className="text-gold">ק. קריניצי</span>
            </h1>
          </Link>
          <p className="mt-3 font-body text-muted-foreground">כניסה למועדון</p>
          <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">אימייל</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-card border-border" dir="ltr" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">סיסמה</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-card border-border" dir="ltr" />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
            {loading ? "מתחבר..." : "כניסה למועדון"}
          </Button>

          <p className="text-center font-body text-sm text-muted-foreground">
            עוד לא חבר?{" "}
            <Link to="/register" className="text-gold hover:underline">
              הצטרף עכשיו
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
