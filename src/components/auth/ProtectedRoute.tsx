import { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireApproval = true, requireAdmin = false }: ProtectedRouteProps) => {
  const [state, setState] = useState<"loading" | "no-session" | "not-approved" | "not-admin" | "ok">("loading");
  const hasResolved = useRef(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) setState("no-session");
          return;
        }

        if (requireApproval || requireAdmin) {
          const { data: profile } = await supabase.from("profiles").select("is_approved").eq("user_id", session.user.id).maybeSingle();
          if (!profile?.is_approved) { if (mounted) setState("not-approved"); return; }
        }

        if (requireAdmin) {
          const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
          const admin = roles?.some((r: any) => r.role === "admin");
          if (!admin) { if (mounted) setState("not-admin"); return; }
        }

        if (mounted) {
          setState("ok");
          hasResolved.current = true;
        }
      } catch {
        // Only redirect if we never successfully resolved
        if (mounted && !hasResolved.current) setState("no-session");
      }
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;
      
      // Only redirect on explicit sign out
      if (event === "SIGNED_OUT") {
        hasResolved.current = false;
        setState("no-session");
      }
      
      // Re-check on new sign in (e.g. after token refresh or Google login)
      if (event === "SIGNED_IN" && !hasResolved.current) {
        check();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
  if (state === "no-session") return <Navigate to="/login" replace />;
  if (state === "not-approved") return <Navigate to="/pending" replace />;
  if (state === "not-admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
