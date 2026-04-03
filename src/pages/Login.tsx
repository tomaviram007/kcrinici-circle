import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isApproved, isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect authenticated users away from login
  useEffect(() => {
    if (!authLoading && user && !isApproved) {
      navigate("/pending", { replace: true });
      return;
    }

    if (!authLoading && user && isApproved) {
      navigate(isAdmin ? "/admin" : "/", { replace: true });
    }
  }, [authLoading, user, isApproved, isAdmin, navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-gold" />
          <p className="font-body text-sm text-muted-foreground">בודק חיבור...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error: any) {
      const msg = error.message?.toLowerCase() || "";
      let description = error.message;
      if (msg.includes("invalid login credentials")) {
        description = "אימייל או סיסמה שגויים";
      } else if (msg.includes("email not confirmed")) {
        description = "האימייל לא אומת. בדוק את תיבת הדואר שלך";
      } else if (msg.includes("too many requests")) {
        description = "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות";
      }
      toast({ title: "שגיאה בכניסה", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({ title: "נשלח בהצלחה", description: "קישור לאיפוס סיסמה נשלח לאימייל שלך" });
      setShowForgot(false);
      setForgotEmail("");
    } catch (error: any) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) throw result.error;

      if (result.redirected) {
        // Browser is redirecting to Google — just return
        return;
      }

      // Tokens received and session set — navigate based on role
      // (the useEffect above will handle routing once AuthContext updates)
    } catch (error: any) {
      const isIframe = window.self !== window.top;
      const msg = error.message?.toLowerCase() || "";
      const isPopupBlocked = msg.includes("popup") || msg.includes("blocked") || msg.includes("cross-origin") || msg.includes("refused");
      
      let description = error.message;
      if (isIframe || isPopupBlocked) {
        description = "התחברות עם Google לא זמינה בתוך iframe. נסה לפתוח את האתר בטאב חדש (לחץ על האייקון בפינה הימנית העליונה של התצוגה המקדימה)";
      } else if (msg.includes("network") || msg.includes("fetch")) {
        description = "בעיית תקשורת. בדוק את החיבור לאינטרנט ונסה שוב";
      }
      
      toast({ title: "שגיאה בחיבור עם Google", description, variant: "destructive" });
      setGoogleLoading(false);
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

        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">אימייל</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-card border-border" dir="ltr" autoComplete="off" />
          </div>
          <div>
            <label className="mb-1.5 block font-body text-sm text-muted-foreground">סיסמה</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-card border-border pl-10"
                dir="ltr"
                autoComplete="off"
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

          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="font-body text-sm text-gold hover:underline"
            >
              שכחתי סיסמה
            </button>
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground font-body py-6 text-base hover:opacity-90">
            {loading ? "מתחבר..." : "כניסה למועדון"}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground font-body">או</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full font-body py-6 text-base gap-2 border-border"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "מתחבר..." : "כניסה עם Google"}
          </Button>

          <p className="text-center font-body text-sm text-muted-foreground">
            עוד לא חבר?{" "}
            <Link to="/register" className="text-gold hover:underline">
              הצטרף עכשיו
            </Link>
          </p>
        </form>
      </div>

      <Dialog open={showForgot} onOpenChange={setShowForgot}>
        <DialogContent className="text-center sm:text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">שכחתי סיסמה</DialogTitle>
            <DialogDescription className="text-base mt-2">
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4 mt-4">
            <Input
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              placeholder="כתובת אימייל"
              className="bg-card border-border"
              dir="ltr"
            />
            <Button type="submit" disabled={forgotLoading} className="w-full gradient-gold text-primary-foreground font-body">
              {forgotLoading ? "שולח..." : "שלח קישור איפוס"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
