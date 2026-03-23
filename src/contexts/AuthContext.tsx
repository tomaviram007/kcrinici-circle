import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  isApproved: boolean;
  isAdmin: boolean;
  loading: boolean;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isApproved: false,
  isAdmin: false,
  loading: true,
  sessionExpired: false,
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
  const [sessionExpired, setSessionExpired] = useState(false);

  const fetchingRef = useRef(false);
  const lastFetchedUserRef = useRef<string | null>(null);
  const hadUserRef = useRef(false);

  useEffect(() => {
    let alive = true;

    // Step 1: Check existing session FIRST before listening for changes
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;

        if (session?.user) {
          setUser(session.user);
          hadUserRef.current = true;
          const result = await fetchProfileAndRoles(session.user.id);
          if (!alive) return;
          setIsApproved(result.isApproved);
          setIsAdmin(result.isAdmin);
          lastFetchedUserRef.current = session.user.id;
        }
      } catch {
        // Session retrieval failed, user stays null
      } finally {
        if (alive) setLoading(false);
      }
    };

    initSession();

    // Step 2: Listen for auth state changes AFTER initial check
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!alive) return;

      if (event === "SIGNED_OUT") {
        const wasLoggedIn = hadUserRef.current;
        setUser(null);
        setIsApproved(false);
        setIsAdmin(false);
        setLoading(false);
        lastFetchedUserRef.current = null;
        hadUserRef.current = false;
        if (wasLoggedIn) {
          setSessionExpired(true);
        }
        return;
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        // Token refresh failed — session expired
        setUser(null);
        setIsApproved(false);
        setIsAdmin(false);
        setLoading(false);
        lastFetchedUserRef.current = null;
        if (hadUserRef.current) {
          setSessionExpired(true);
          hadUserRef.current = false;
        }
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
        setSessionExpired(false);

        if (!currentUser) {
          setIsApproved(false);
          setIsAdmin(false);
          setLoading(false);
          lastFetchedUserRef.current = null;
          return;
        }

        hadUserRef.current = true;

        if (lastFetchedUserRef.current === currentUser.id) {
          setLoading(false);
          return;
        }

        if (fetchingRef.current) return;
        fetchingRef.current = true;

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

    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || !alive) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!alive) return;
        if (!session && hadUserRef.current) {
          setUser(null);
          setIsApproved(false);
          setIsAdmin(false);
          lastFetchedUserRef.current = null;
          hadUserRef.current = false;
          setSessionExpired(true);
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

  return <AuthContext.Provider value={{ user, isApproved, isAdmin, loading, sessionExpired }}>{children}</AuthContext.Provider>;
};
