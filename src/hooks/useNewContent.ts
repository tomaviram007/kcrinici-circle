import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_KEY = "new_content_seen";

interface NewContentState {
  deals: boolean;
  jobs: boolean;
  announcements: boolean;
}

const getSeenPages = (): Record<string, boolean> => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch {
    return {};
  }
};

const markPageSeen = (page: string) => {
  const seen = getSeenPages();
  seen[page] = true;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(seen));
};

export const useNewContent = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NewContentState>({
    deals: false,
    jobs: false,
    announcements: false,
  });

  const checkNew = useCallback(async () => {
    if (!user) {
      setState({ deals: false, jobs: false, announcements: false });
      return;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const seen = getSeenPages();

    const [dealsRes, jobsRes, announcementsRes] = await Promise.all([
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("is_approved", true)
        .gte("created_at", since),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .eq("is_approved", true)
        .gte("created_at", since),
      supabase
        .from("announcements")
        .select("id", { count: "exact", head: true })
        .eq("is_approved", true)
        .gte("created_at", since),
    ]);

    setState({
      deals: !seen["/deals"] && (dealsRes.count ?? 0) > 0,
      jobs: !seen["/jobs"] && (jobsRes.count ?? 0) > 0,
      announcements: !seen["/announcements"] && (announcementsRes.count ?? 0) > 0,
    });
  }, [user]);

  useEffect(() => {
    checkNew();
  }, [checkNew]);

  const markSeen = useCallback(
    (path: string) => {
      const key = path as keyof NewContentState;
      if (key in state) {
        markPageSeen(path);
        setState((prev) => ({ ...prev, [key]: false }));
      }
    },
    [state]
  );

  return { newContent: state, markSeen };
};
