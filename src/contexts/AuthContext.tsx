import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

  // מונע ריצה כפולה של fetchProfileAndRoles
  const fetchingRef = useRef(false);
  // שומר את ה-userId האחרון שעליו כבר טענו פרופיל
  const lastFetchedUserRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!alive) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setIsApproved(false);
        setIsAdmin(false);
        setLoading(false);
        lastFetchedUserRef.current = null;
        return;
      }

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
          setIsApproved(false);
          setIsAdmin(false);
          setLoading(false);
          lastFetchedUserRef.current = null;
          return;
        }

        // אם כבר טענו פרופיל לאותו משתמש — דילוג (TOKEN_REFRESHED או SIGNED_IN כפול)
        if (lastFetchedUserRef.current === currentUser.id) {
          setLoading(false);
          return;
        }

        // מניעת ריצה כפולה מקבילה — אם כבר רץ, דילוג בלי לחסום loading
        if (fetchingRef.current) {
          // לא עושים return בלי setLoading(false) — ה-fetch הראשון יטפל
          return;
        }
        fetchingRef.current = true;

        setLoading(true);

        const result = await fetchProfileAndRoles(currentUser.id);

        if (alive) {
          setIsApproved(result.isApproved);
          setIsAdmin(result.isAdmin);
          setLoading(false);
          lastFetchedUserRef.current = currentUser.id;
        }

        fetchingRef.current = false;
      }
    });

    const safety = setTimeout(() => {
      if (alive) setLoading(false);
    }, 5000);

    // visibilitychange — רק בודק אם המשתמש התנתק בטאב אחר, בלי לגרום לרנדור
    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || !alive) return;

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!alive) return;
        // רק אם אין session כלל — מנקים state
        // אם יש session, onAuthStateChange יטפל בכל השאר
        if (!session) {
          setUser(null);
          setIsApproved(false);
          setIsAdmin(false);
          lastFetchedUserRef.current = null;
        }
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      alive = false;
      clearTimeout(safety);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <AuthContext.Provider value={{ user, isApproved, isAdmin, loading }}>{children}</AuthContext.Provider>;
};
