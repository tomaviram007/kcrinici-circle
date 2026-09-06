import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// How often an idle tab asks whether a newer build exists
const POLL_MS = 5 * 60 * 1000;
// Never ask more often than this, however many triggers fire together
const MIN_GAP_MS = 45 * 1000;

/**
 * Tells a tab that was opened before the latest deploy that a newer version of
 * the site is live, with a button that reloads it.
 *
 * Every build writes its id to /version.json and bakes the same id into the
 * bundle. When they stop matching, the tab is stale. Checked on an interval,
 * when the tab regains focus or becomes visible, and on navigation.
 */
export const useVersionCheck = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const lastCheck = useRef(0);
  const notified = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;
  const checkRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Dev server has no version.json and hot reloads on its own
    if (import.meta.env.DEV) return;

    const notify = () => {
      if (notified.current) return;
      notified.current = true;
      toast(tRef.current("version.title"), {
        description: tRef.current("version.body"),
        duration: Infinity,
        closeButton: true,
        action: {
          label: tRef.current("version.reload"),
          onClick: () => window.location.reload(),
        },
      });
    };

    const check = async () => {
      if (notified.current || document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastCheck.current < MIN_GAP_MS) return;
      lastCheck.current = now;
      try {
        const res = await fetch(`/version.json?t=${now}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { build?: string };
        if (data.build && data.build !== __BUILD_ID__) notify();
      } catch {
        // Offline or blocked. Try again on the next trigger.
      }
    };

    checkRef.current = check;

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    const timer = window.setInterval(check, POLL_MS);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // A page change is a natural moment to look. check() throttles itself.
  useEffect(() => {
    checkRef.current();
  }, [pathname]);
};
