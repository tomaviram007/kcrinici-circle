import { supabase } from "@/integrations/supabase/client";

const ANON_KEY = "kc_anon_id";
const SESSION_KEY = "kc_session_id";

const randomId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

export const getAnonId = (): string => {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "nostorage000000";
  }
};

export const getSessionId = (): string => {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "nosession000000";
  }
};

type EventType = "page_view" | "action" | "funnel";

const send = async (
  eventType: EventType,
  name: string,
  opts: { path?: string; durationMs?: number; props?: Record<string, unknown> } = {}
) => {
  try {
    await (supabase as any).rpc("track_event", {
      _anon_id: getAnonId(),
      _session_id: getSessionId(),
      _event_type: eventType,
      _name: name.slice(0, 80),
      _path: opts.path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      _duration_ms: opts.durationMs ?? null,
      _props: opts.props ?? {},
    });
  } catch {
    // analytics must never break the UI
  }
};

/** Track a page view. durationMs is the time spent on the previous page. */
export const trackPageView = (path: string, durationMs?: number) =>
  send("page_view", path, { path, durationMs });

/** Track a meaningful user action (button click, submission, contact, share...). */
export const trackAction = (name: string, props?: Record<string, unknown>) =>
  send("action", name, { props });

/** Track a step in a funnel (e.g. registration). */
export const trackFunnel = (step: string, props?: Record<string, unknown>) =>
  send("funnel", step, { props });
