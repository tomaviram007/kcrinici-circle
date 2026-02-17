import { useEffect, useState, useRef, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus, LogIn } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
}

const TeaserOverlay = ({ type }: { type: "no-session" | "not-approved" }) => (
  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
    <div className="mx-4 max-w-md rounded-2xl border border-gold/20 bg-card p-8 text-center shadow-2xl">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-background">
        <Lock className="h-7 w-7 text-gold" />
      </div>

      {type === "no-session" ? (
        <>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            תוכן <span className="text-gold">בלעדי</span> לחברי המועדון
          </h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            הצטרף למועדון הגברים של ק. קריניצי כדי לצפות בתוכן המלא
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild className="gradient-gold text-primary-foreground font-body hover:opacity-90">
              <Link to="/register"><UserPlus className="mr-2 h-4 w-4" />הצטרף למועדון</Link>
            </Button>
            <Button asChild variant="outline" className="font-body border-gold/30 text-gold hover:bg-gold/10">
              <Link to="/login"><LogIn className="mr-2 h-4 w-4" />כניסה לחברים</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-serif text-2xl font-bold text-foreground">
            ממתין <span className="text-gold">לאישור</span>
          </h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">
            בקשתך נשלחה להנהלת המועדון. תקבל הודעה ברגע שהגישה תאושר.
          </p>
          <div className="mt-6">
            <Button asChild variant="outline" className="font-body border-gold/30 text-gold hover:bg-gold/10">
              <Link to="/">חזרה לעמוד הראשי</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  </div>
);

// Standard function component (not forwardRef)
const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false }: ProtectedRouteProps) => {
  const [state, setState] = useState<"loading" | "no-session" | "not-approved" | "not-admin" | "ok">("loading");
  const resolvedOk = useRef(false);
  const signedOutExplicitly = useRef(false);

  const check = useCallback(async (mounted: () => boolean) => {
    if (signedOutExplicitly.current) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!resolvedOk.current && mounted()) setState("no-session");
        return;
      }

      if (requireApproval || requireAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_approved")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profile?.is_approved) {
          if (!resolvedOk.current && mounted()) setState("not-approved");
          return;
        }
      }

      if (requireAdmin) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const admin = roles?.some((r: any) => r.role === "admin");
        if (!admin) {
          if (!resolvedOk.current && mounted()) setState("not-admin");
          return;
        }
      }

      if (mounted()) {
        resolvedOk.current = true;
        setState("ok");
      }
    } catch {
      if (!resolvedOk.current && mounted()) setState("no-session");
    }
  }, [requireApproval, requireAdmin]);

  useEffect(() => {
    let alive = true;
    const isMounted = () => alive;

    check(isMounted);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!alive) return;

      if (event === "SIGNED_OUT") {
        signedOutExplicitly.current = true;
        resolvedOk.current = false;
        setState("no-session");
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        signedOutExplicitly.current = false;
        check(isMounted);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [check]);

  if (state === "loading") return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-gold" />
        <p className="font-body text-sm text-muted-foreground">טוען...</p>
      </div>
    </div>
  );

  if (state === "not-admin") return <Navigate to="/dashboard" replace />;

  // Teaser mode: show blurred content with overlay
  if (state === "no-session" || state === "not-approved") {
    return (
      <div className="relative min-h-[60vh]">
        <div className="pointer-events-none select-none" style={{ filter: "blur(8px)" }}>
          {children}
        </div>
        <TeaserOverlay type={state} />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
