import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

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
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("is_approved").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (profileResult.error || rolesResult.error) {
      throw profileResult.error ?? rolesResult.error;
    }

    return {
      isApproved: profileResult.data?.is_approved ?? false,
      isAdmin: rolesResult.data?.some((r) => r.role === "admin") ?? false,
    };
  } catch {
    return null;
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
  const currentUserIdRef = useRef<string | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    const clearRetry = () => {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };

    const resetAccessState = () => {
      setIsApproved(false);
      setIsAdmin(false);
      lastFetchedUserRef.current = null;
      fetchingRef.current = false;
    };

    const loadAccessState = async (userId: string, attempt = 0) => {
      if (!alive || currentUserIdRef.current !== userId) return;

      if (attempt === 0) {
        if (lastFetchedUserRef.current === userId) {
          setLoading(false);
          return;
        }

        if (fetchingRef.current) {
          return;
        }
      }

      fetchingRef.current = true;
      setLoading(true);

      const result = await fetchProfileAndRoles(userId);

      if (!alive || currentUserIdRef.current !== userId) {
        fetchingRef.current = false;
        return;
      }

      if (!result) {
        fetchingRef.current = false;

        if (attempt < 3) {
          clearRetry();
          retryTimeoutRef.current = window.setTimeout(() => {
            void loadAccessState(userId, attempt + 1);
          }, 200 * (attempt + 1));
          return;
        }

        setLoading(false);
        return;
      }

      setIsApproved(result.isApproved);
      setIsAdmin(result.isAdmin);
      setLoading(false);
      lastFetchedUserRef.current = userId;
      fetchingRef.current = false;
    };

    const applySession = (session: Session | null) => {
      const currentUser = session?.user ?? null;

      currentUserIdRef.current = currentUser?.id ?? null;
      setUser(currentUser);
      setSessionExpired(false);

      if (!currentUser) {
        resetAccessState();
        setLoading(false);
        return;
      }

      hadUserRef.current = true;
      clearRetry();

      window.setTimeout(() => {
        void loadAccessState(currentUser.id);
      }, 0);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      if (event === "SIGNED_OUT") {
        const wasLoggedIn = hadUserRef.current;
        clearRetry();
        currentUserIdRef.current = null;
        setUser(null);
        resetAccessState();
        setLoading(false);
        hadUserRef.current = false;
        if (wasLoggedIn) {
          setSessionExpired(true);
        }
        return;
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        clearRetry();
        currentUserIdRef.current = null;
        setUser(null);
        resetAccessState();
        setLoading(false);
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
        applySession(session);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      applySession(session);
    }).catch(() => {
      if (alive) setLoading(false);
    });

    const safety = setTimeout(() => {
      if (alive) setLoading(false);
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState !== "visible" || !alive) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!alive) return;
        if (!session && hadUserRef.current) {
          clearRetry();
          currentUserIdRef.current = null;
          setUser(null);
          resetAccessState();
          hadUserRef.current = false;
          setSessionExpired(true);
          setLoading(false);
          return;
        }

        if (session?.user && lastFetchedUserRef.current !== session.user.id) {
          applySession(session);
        }
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      alive = false;
      clearRetry();
      clearTimeout(safety);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <AuthContext.Provider value={{ user, isApproved, isAdmin, loading, sessionExpired }}>{children}</AuthContext.Provider>;
};
