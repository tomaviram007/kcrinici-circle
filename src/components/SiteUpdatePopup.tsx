import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import { trackAction } from "@/lib/analytics";

interface SiteUpdate {
  id: string;
  badge_text: string;
  title: string;
  body: string | null;
  image_url: string | null;
  button_text: string;
  button_url: string;
  audience: string;
  max_displays: number;
  updated_at: string;
}

/**
 * Counts popup views per browser, keyed by update id and its updated_at, so
 * editing an update gives it a fresh run instead of staying silently dismissed.
 * Wrapped in try/catch because storage throws in private mode on some browsers.
 */
const storageKey = (u: SiteUpdate) => `site_update_seen_${u.id}_${u.updated_at}`;

const readViews = (u: SiteUpdate): number => {
  try {
    return parseInt(localStorage.getItem(storageKey(u)) || "0", 10) || 0;
  } catch {
    return 0;
  }
};

const bumpViews = (u: SiteUpdate) => {
  try {
    localStorage.setItem(storageKey(u), String(readViews(u) + 1));
  } catch {
    /* storage unavailable, popup simply shows again next visit */
  }
};

const SiteUpdatePopup = () => {
  const navigate = useNavigate();
  const { user, isApproved } = useAuth();
  const [update, setUpdate] = useState<SiteUpdate | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const load = async () => {
      const { data } = await (supabase as any).rpc("get_active_site_updates");
      if (cancelled || !data?.length) return;

      const isMember = !!user && isApproved;
      const eligible = (data as SiteUpdate[]).find((u) => {
        if (u.audience === "members" && !isMember) return false;
        if (u.audience === "guests" && isMember) return false;
        return readViews(u) < u.max_displays;
      });
      if (!eligible) return;

      // Let the page settle first, and never stack on top of another popup
      // (birthdays and polls also open on entry). If one is up, we stay quiet
      // and keep our view count untouched so this update gets its turn later.
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (document.querySelector('[role="dialog"]')) return;
        setUpdate(eligible);
        setOpen(true);
        bumpViews(eligible);
        trackAction("site_update_popup_shown", { updateId: eligible.id });
      }, 1600);
    };

    load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [user, isApproved]);

  if (!update) return null;

  const goToUpdate = () => {
    trackAction("site_update_popup_click", { updateId: update.id, url: update.button_url });
    setOpen(false);
    if (/^https?:\/\//i.test(update.button_url)) {
      window.open(update.button_url, "_blank", "noopener,noreferrer");
    } else {
      navigate(update.button_url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[94vw] max-w-md overflow-hidden p-0 gap-0" dir="rtl">
        {update.image_url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary">
            <img src={update.image_url} alt={update.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          </div>
        )}

        <div className={`px-6 pb-6 ${update.image_url ? "-mt-6 relative" : "pt-8"}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-body text-[11px] font-bold text-gold">
            <Sparkles className="h-3 w-3" />
            {update.badge_text}
          </span>

          <h2 className="mt-3 font-serif text-2xl font-bold leading-tight text-foreground">
            {update.title}
          </h2>

          {update.body && (
            <p className="mt-2 whitespace-pre-line font-body text-sm leading-relaxed text-muted-foreground">
              {update.body}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={goToUpdate} className="gradient-gold h-11 w-full font-body text-primary-foreground">
              {update.button_text}
              <ArrowLeft className="mr-1.5 h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} className="h-9 w-full font-body text-xs text-muted-foreground">
              אולי בפעם הבאה
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SiteUpdatePopup;
