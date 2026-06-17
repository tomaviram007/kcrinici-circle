import { Link, useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // If not logged in, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-gold" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-card border border-gold/20 glow-gold">
          <Clock className="h-10 w-10 text-gold" />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-foreground">
          ממתין <span className="text-gold">לאישור</span>
        </h1>
        
        <p className="mt-4 font-body text-lg leading-relaxed text-muted-foreground">
          בקשתך נשלחה להנהלת המועדון.
          <br />
          תקבל הודעה במייל ברגע שהגישה תאושר.
        </p>
        
        <div className="mt-6 mx-auto h-px w-16 gradient-gold opacity-30" />
        
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link
            to="/"
            className="font-body text-sm text-gold hover:underline"
          >
            חזרה לעמוד הראשי
          </Link>
          
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2 border-border text-muted-foreground hover:text-foreground font-body"
          >
            <LogOut className="h-4 w-4" />
            התנתק והתחבר כמשתמש אחר
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
