import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false }: ProtectedRouteProps) => {
  const [state, setState] = useState<"loading" | "no-session" | "not-approved" | "not-admin" | "ok">("loading");
  const resolvedOk = useRef(false);
  const signedOutExplicitly = useRef(false);

  const check = useCallback(async (mounted: () => boolean) => {
    // If user explicitly signed out, don't re-check
    if (signedOutExplicitly.current) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Only redirect if we never resolved successfully before
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
      // Network error during check — only redirect if never resolved
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
  if (state === "no-session") return <Navigate to="/login" replace />;
  if (state === "not-approved") return <Navigate to="/pending" replace />;
  if (state === "not-admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
