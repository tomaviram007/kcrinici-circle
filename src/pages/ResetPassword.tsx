import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "שגיאה", description: "הסיסמאות לא תואמות", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "שגיאה", description: "הסיסמה חייבת להכיל לפחות 6 תווים", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Ensure session is ready before updating password
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        // Try refreshing session from URL hash tokens
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error("הסשן פג תוקף. נסה לבקש קישור איפוס חדש.");
        }
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        // Handle LockManager timeout specifically
        if (error.message?.toLowerCase().includes("lock")) {
          // Retry once after a short delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { error: retryError } = await supabase.auth.updateUser({ password });
          if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      toast({ title: "הסיסמה עודכנה בהצלחה", description: "מעביר אותך לדף הראשי..." });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error: any) {
      const msg = error.message?.toLowerCase().includes("lock")
        ? "שגיאת תזמון בדפדפן. נסה שוב בעוד רגע."
        : error.message;
      toast({ title: "שגיאה", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground mb-4">קישור לא תקין</h1>
          <p className="font-body text-muted-foreground mb-6">הקישור לאיפוס הסיסמה אינו תקין או שפג תוקפו</p>
          <Link to="/login">
            <Button className="gradient-gold text-primary-foreground font-body">חזרה לדף הכניסה</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link to="/" className="inline-block">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              הגברים של <span className="text-gold">ק.קרניצי</span>
            </h1>
          </Link>
          <p className="mt-3 font-body text-muted-foreground">איפוס סיסמה</p>
          <div className="mt-3 mx-auto h-px w-12 gradient-gold opacity-40" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">סיסמה חדשה</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-card border-border pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">אימות סיסמה</label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-card border-border"
              dir="ltr"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
            {loading ? "מעדכן..." : "עדכן סיסמה"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
