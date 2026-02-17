import { useEffect, useState, useRef } from "react";
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

const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false }: ProtectedRouteProps) => {
  const [state, setState] = useState<"loading" | "no-session" | "not-approved" | "not-admin" | "ok">("loading");
  const resolved = useRef(false);

  useEffect(() => {
    let alive = true;
    resolved.current = false;
    setState("loading");

    const setResolved = (newState: "no-session" | "not-approved" | "not-admin" | "ok") => {
      if (alive) {
        resolved.current = true;
        setState(newState);
      }
    };

    const check = async (session: import("@supabase/supabase-js").Session | null, silent = false) => {
      try {
        if (!session) {
          setResolved("no-session");
          return;
        }

        if (requireApproval || requireAdmin) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_approved")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!alive) return;

          if (profileError) {
            console.warn("ProtectedRoute: profile query error (will retry on token refresh):", profileError.message);
            // Don't resolve to "no-session" — the token may have expired.
            // Stay in current state and wait for TOKEN_REFRESHED or visibilitychange.
            return;
          }

          if (!profile?.is_approved) {
            setResolved("not-approved");
            return;
          }
        }

        if (requireAdmin) {
          const { data: roles, error: rolesError } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id);

          if (!alive) return;

          if (rolesError) {
            console.warn("ProtectedRoute: roles query error (will retry on token refresh):", rolesError.message);
            return;
          }

          const admin = roles?.some((r: any) => r.role === "admin");
          if (!admin) {
            setResolved("not-admin");
            return;
          }
        }

        setResolved("ok");
      } catch (err) {
        console.warn("ProtectedRoute: check failed, waiting for refresh:", err);
        // Don't resolve to "no-session" — wait for token refresh
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT") {
        setResolved("no-session");
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        resolved.current = false;
        setState("loading");
        check(session);
      } else if (event === "TOKEN_REFRESHED") {
        // Silent re-check: don't show loading spinner
        check(session, true);
      }
    });

    // Re-check when tab becomes visible again (handles missed auth events)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && alive) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (alive) {
            check(session, true);
          }
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Safety timeout
    const timeout = setTimeout(() => {
      if (alive && !resolved.current) {
        console.warn("ProtectedRoute: timed out after 10s, retrying with getSession");
        // Instead of defaulting to no-session, try one more time
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (alive && !resolved.current) {
            if (!session) {
              setResolved("no-session");
            } else {
              check(session);
            }
          }
        });
      }
    }, 10000);

    return () => {
      alive = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requireApproval, requireAdmin]);

  if (state === "loading") return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-gold" />
        <p className="font-body text-sm text-muted-foreground">טוען...</p>
      </div>
    </div>
  );

  if (state === "not-admin") return <Navigate to="/dashboard" replace />;

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
