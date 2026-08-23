import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Records a page_view on every route change, including how long the
 * previous page was open (duration_ms).
 */
export const usePageAnalytics = () => {
  const location = useLocation();
  const enteredAt = useRef<number>(Date.now());
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname;
    const now = Date.now();
    const duration = previousPath.current ? now - enteredAt.current : undefined;

    trackPageView(path, duration);

    previousPath.current = path;
    enteredAt.current = now;
  }, [location.pathname]);

  // Capture time spent on the last page before leaving the site
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && previousPath.current) {
        trackPageView(previousPath.current, Date.now() - enteredAt.current);
        enteredAt.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);
};
