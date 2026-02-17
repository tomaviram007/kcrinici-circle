import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, UserPlus, LogIn } from "lucide-react";
import type { Session } from "@supabase/supabase-js";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
}

type AuthState = "loading" | "no-session" | "not-approved" | "not-admin" | "ok";

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

/**
 * Given a session, check profile approval and admin role.
 * Returns the appropriate AuthState.
 */
async function checkAccess(
  session: Session | null,
  requireApproval: boolean,
  requireAdmin: boolean
): Promise<AuthState> {
  if (!session) return "no-session";

  try {
    if (requireApproval || requireAdmin) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        // Token may be expired — try refreshing once
        console.warn("ProtectedRoute: profile query failed, refreshing session…");
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed.session) return "no-session";

        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("is_approved")
          .eq("user_id", refreshed.session.user.id)
          .maybeSingle();

        if (!retryProfile?.is_approved) return "not-approved";
      } else if (!profile?.is_approved) {
        return "not-approved";
      }
    }

    if (requireAdmin) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (!roles?.some((r: any) => r.role === "admin")) return "not-admin";
    }

    return "ok";
  } catch (err) {
    console.warn("ProtectedRoute: access check error:", err);
    return "no-session";
  }
}

const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false }: ProtectedRouteProps) => {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let alive = true;

    // onAuthStateChange is the SOLE source of truth.
    // It fires INITIAL_SESSION immediately with the current session (or null).
    // No separate getSession() call needed — avoids initialization race conditions.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      console.log("ProtectedRoute: auth event:", event, session ? "has session" : "no session");

      if (event === "SIGNED_OUT") {
        setState("no-session");
        return;
      }

      // For INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED — check access
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Only show loading spinner on initial load, not on background refreshes
        if (event !== "TOKEN_REFRESHED") {
          setState("loading");
        }

        checkAccess(session, requireApproval, requireAdmin).then((result) => {
          if (alive) {
            console.log("ProtectedRoute: resolved to:", result);
            setState(result);
          }
        });
      }
    });

    // Safety: if nothing fires within 5 seconds, force no-session
    const safety = setTimeout(() => {
      if (alive) {
        setState((current) => {
          if (current === "loading") {
            console.warn("ProtectedRoute: safety timeout, forcing no-session");
            return "no-session";
          }
          return current;
        });
      }
    }, 5000);

    // Re-check when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && alive) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!alive) return;
          checkAccess(session, requireApproval, requireAdmin).then((result) => {
            if (alive) setState(result);
          });
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      alive = false;
      clearTimeout(safety);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
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
