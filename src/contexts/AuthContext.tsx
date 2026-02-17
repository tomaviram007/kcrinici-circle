import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isApproved: false,
  isAdmin: false,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

async function fetchProfileAndRoles(userId: string) {
  try {
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("is_approved").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    return {
      isApproved: profile?.is_approved ?? false,
      isAdmin: roles?.some((r: any) => r.role === "admin") ?? false,
    };
  } catch {
    return { isApproved: false, isAdmin: false };
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!alive) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsApproved(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Don't flash loading on background token refreshes
          if (event !== "TOKEN_REFRESHED") setLoading(true);

          const result = await fetchProfileAndRoles(currentUser.id);
          if (alive) {
            setIsApproved(result.isApproved);
            setIsAdmin(result.isAdmin);
            setLoading(false);
          }
        } else {
          setIsApproved(false);
          setIsAdmin(false);
          setLoading(false);
        }
      }
    });

    // Safety timeout
    const safety = setTimeout(() => {
      if (alive) setLoading(false);
    }, 5000);

    // Silent re-check when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && alive) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!alive) return;
          if (!session) {
            setUser(null);
            setIsApproved(false);
            setIsAdmin(false);
          }
          // If session exists, TOKEN_REFRESHED will fire if needed
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
  }, []);

  return (
    <AuthContext.Provider value={{ user, isApproved, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
