import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Eye, MousePointerClick, Users, Activity, X, Clock, Search, LogIn } from "lucide-react";
import { avatarSrc } from "@/lib/default-avatar";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Overview {
  total_events: number;
  page_views: number;
  unique_visitors: number;
  logged_in_visitors: number;
  daily: { day: string; visitors: number; views: number }[];
  top_pages: { path: string; views: number; visitors: number; avg_seconds: number }[];
  top_actions: { name: string; count: number; users: number }[];
  funnel: { name: string; count: number }[];
}

interface VisitorRow {
  anon_id: string;
  user_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  events_count: number;
  page_views: number;
  actions_count: number;
  first_seen: string;
  last_seen: string;
}

interface TimelineRow {
  id: string;
  created_at: string;
  event_type: string;
  name: string;
  path: string | null;
  duration_ms: number | null;
  props: Record<string, unknown> | null;
}

const PAGE_LABELS: Record<string, string> = {
  "/": "דף הבית",
  "/events": "אירועים",
  "/jobs": "לוח דרושים",
  "/members": "חברי המועדון",
  "/deals": "הטבות",
  "/secondhand": "יד שנייה",
  "/gallery": "גלריה",
  "/recommendations": "אנשי מקצוע",
  "/announcements": "לוח מודעות",
  "/register": "הרשמה",
  "/login": "התחברות",
  "/profile": "פרופיל אישי",
  "/admin": "ניהול",
};

const ACTION_LABELS: Record<string, string> = {
  share_whatsapp: "שיתוף בוואטסאפ",
  share_facebook: "שיתוף בפייסבוק",
  event_register_open: "פתיחת טופס הרשמה לאירוע",
  event_register_submit: "הרשמה לאירוע",
  event_rsvp: "אישור הגעה לאירוע",
  secondhand_submit: "פרסום פריט יד שנייה",
  job_submit: "פרסום משרה",
  deal_website_click: "כניסה לאתר של הטבה",
  deal_claim: "מימוש הטבה",
  contact_whatsapp: "יצירת קשר בוואטסאפ",
  contact_call: "לחיצה על חיוג",
  member_card_open: "פתיחת כרטיס חבר",
  floating_whatsapp: "כפתור וואטסאפ צף",
};

const FUNNEL_LABELS: Record<string, string> = {
  register_view: "1. כניסה לעמוד ההרשמה",
  register_details_filled: "2. מילוי פרטים אישיים",
  register_avatar_uploaded: "3. העלאת תמונת פרופיל",
  register_submit: "4. שליחת הבקשה",
  register_success: "5. הרשמה הושלמה",
};

const label = (map: Record<string, string>, key: string) => map[key] || key;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

const AdminAnalytics = () => {
  const [days, setDays] = useState(30);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [ov, vis] = await Promise.all([
        (supabase as any).rpc("admin_analytics_overview", { _days: days }),
        (supabase as any).rpc("admin_analytics_visitors", { _days: days, _limit: 200 }),
      ]);
      if (!active) return;
      setOverview((ov.data as Overview) || null);
      setVisitors((vis.data as VisitorRow[]) || []);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [days]);

  const openTimeline = async (row: VisitorRow) => {
    setSelected(row);
    setTimelineLoading(true);
    const { data } = await (supabase as any).rpc("admin_analytics_timeline", {
      _anon_id: row.anon_id,
      _user_id: row.user_id,
      _limit: 300,
    });
    setTimeline((data as TimelineRow[]) || []);
    setTimelineLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter(
      (v) =>
        (v.full_name || "").toLowerCase().includes(q) ||
        (v.email || "").toLowerCase().includes(q) ||
        v.anon_id.toLowerCase().includes(q)
    );
  }, [visitors, search]);

  const stats = [
    { label: "מבקרים ייחודיים", value: overview?.unique_visitors ?? 0, icon: Users },
    { label: "צפיות בעמודים", value: overview?.page_views ?? 0, icon: Eye },
    { label: "משתמשים מחוברים", value: overview?.logged_in_visitors ?? 0, icon: LogIn },
    { label: "סה\"כ אירועים", value: overview?.total_events ?? 0, icon: Activity },
  ];

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-bold text-foreground">אנליטיקות</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d} ימים
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <s.icon className="h-5 w-5 mx-auto text-gold mb-1" />
            <div className="font-serif text-2xl font-bold text-foreground">{loading ? "…" : s.value}</div>
            <div className="font-body text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-serif text-lg font-bold text-foreground mb-3">מבקרים לפי יום</h3>
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={overview?.daily || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                }}
              />
              <Area type="monotone" dataKey="visitors" stroke="hsl(43 72% 52%)" fill="hsl(43 72% 52% / 0.2)" />
              <Area type="monotone" dataKey="views" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground) / 0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top pages */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-serif text-lg font-bold text-foreground mb-3">עמודים פופולריים</h3>
          <ul className="space-y-2">
            {(overview?.top_pages || []).slice(0, 10).map((p) => (
              <li key={p.path} className="flex items-center justify-between gap-2 font-body text-sm">
                <span className="text-foreground truncate">{label(PAGE_LABELS, p.path)}</span>
                <span className="text-muted-foreground whitespace-nowrap text-xs">
                  {p.views} צפיות · {p.avg_seconds}ש׳
                </span>
              </li>
            ))}
            {!loading && !overview?.top_pages?.length && (
              <li className="font-body text-sm text-muted-foreground">אין נתונים עדיין</li>
            )}
          </ul>
        </div>

        {/* Top actions */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-serif text-lg font-bold text-foreground mb-3">פעולות נפוצות</h3>
          <ul className="space-y-2">
            {(overview?.top_actions || []).slice(0, 10).map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-2 font-body text-sm">
                <span className="text-foreground truncate">{label(ACTION_LABELS, a.name)}</span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">{a.count}</span>
              </li>
            ))}
            {!loading && !overview?.top_actions?.length && (
              <li className="font-body text-sm text-muted-foreground">אין נתונים עדיין</li>
            )}
          </ul>
        </div>

        {/* Funnel */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-serif text-lg font-bold text-foreground mb-3">משפך הרשמה</h3>
          <ul className="space-y-2">
            {Object.keys(FUNNEL_LABELS).map((step) => {
              const row = overview?.funnel?.find((f) => f.name === step);
              const first = overview?.funnel?.find((f) => f.name === "register_view")?.count || 0;
              const count = row?.count || 0;
              const pct = first ? Math.round((count / first) * 100) : 0;
              return (
                <li key={step} className="font-body text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{FUNNEL_LABELS[step]}</span>
                    <span className="text-muted-foreground text-xs">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Visitors list */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="font-serif text-lg font-bold text-foreground">מבקרים אחרונים</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              dir="rtl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או אימייל"
              className="pr-9 text-right"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((v) => (
            <button
              key={v.anon_id}
              onClick={() => openTimeline(v)}
              className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3 text-right transition-colors hover:border-gold/40"
            >
              <img
                src={avatarSrc(v.avatar_url, v.user_id || v.anon_id)}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="font-body text-sm text-foreground truncate">
                  {v.full_name || "גולש אנונימי"}
                </div>
                <div className="font-body text-xs text-muted-foreground truncate">
                  {v.email || `מזהה: ${v.anon_id.slice(0, 10)}`}
                </div>
              </div>
              <div className="font-body text-xs text-muted-foreground whitespace-nowrap">
                {v.page_views} עמודים · {v.actions_count} פעולות
              </div>
              <div className="hidden sm:flex items-center gap-1 font-body text-xs text-muted-foreground whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {fmtDate(v.last_seen)}
              </div>
            </button>
          ))}
          {!loading && !filtered.length && (
            <p className="font-body text-sm text-muted-foreground">אין נתונים עדיין</p>
          )}
        </div>
      </div>

      {/* Timeline dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto [&>button]:hidden">
          <button
            onClick={() => setSelected(null)}
            aria-label="סגירה"
            className="absolute left-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="pt-2">
            <h3 className="font-serif text-xl font-bold text-foreground">
              {selected?.full_name || "גולש אנונימי"}
            </h3>
            <p className="font-body text-xs text-muted-foreground">
              {selected?.email || `מזהה אנונימי: ${selected?.anon_id}`}
            </p>
          </div>

          <ol className="mt-4 space-y-3 border-r border-border pr-4">
            {timelineLoading && <li className="font-body text-sm text-muted-foreground">טוען…</li>}
            {timeline.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -right-[21px] top-1.5 h-2 w-2 rounded-full bg-gold" />
                <div className="font-body text-sm text-foreground">
                  {t.event_type === "page_view" && (
                    <>
                      צפייה בעמוד <strong>{label(PAGE_LABELS, t.name)}</strong>
                      {t.duration_ms ? ` · ${Math.round(t.duration_ms / 1000)} שניות` : ""}
                    </>
                  )}
                  {t.event_type === "action" && (
                    <>
                      <MousePointerClick className="inline h-3.5 w-3.5 text-gold ml-1" />
                      {label(ACTION_LABELS, t.name)}
                    </>
                  )}
                  {t.event_type === "funnel" && <>{label(FUNNEL_LABELS, t.name)}</>}
                </div>
                <div className="font-body text-[11px] text-muted-foreground">{fmtDate(t.created_at)}</div>
              </li>
            ))}
            {!timelineLoading && !timeline.length && (
              <li className="font-body text-sm text-muted-foreground">אין פעילות מתועדת</li>
            )}
          </ol>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnalytics;
