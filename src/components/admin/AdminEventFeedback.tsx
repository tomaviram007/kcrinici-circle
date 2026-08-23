import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, QrCode, Loader2, Star, Users, Repeat, MessageSquare, Trash2, Copy } from "lucide-react";
import QRCode from "qrcode";

interface EventOption {
  id: string;
  title: string;
  event_date: string;
}

interface FeedbackRow {
  id: string;
  event_id: string;
  created_at: string;
  enjoyment: number;
  met_new_person: boolean;
  new_people_count: number | null;
  keep_in_touch: boolean;
  keep_in_touch_name: string | null;
  attend_reason: string | null;
  preferred_meetup_type: string | null;
  meaningful_moment: string | null;
  improvement: string | null;
  next_event_likelihood: number | null;
  nps: number | null;
}

interface Summary {
  total: number;
  avg_enjoyment: number | null;
  met_new_pct: number;
  keep_in_touch_pct: number;
  return_pct: number;
  avg_new_people: number | null;
  nps: number | null;
  avg_nps: number | null;
  meetup_types: { name: string; count: number }[];
  attend_reasons: { name: string; count: number }[];
  by_event: { event_id: string; title: string; event_date: string; total: number; avg_enjoyment: number }[];
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4 text-right">
    <div className="mb-2 flex items-center justify-end gap-2 text-muted-foreground">
      <span className="font-body text-xs">{label}</span>
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <p className="font-serif text-2xl font-bold text-foreground">{value}</p>
    {hint && <p className="mt-1 font-body text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

const AdminEventFeedback = () => {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState<string>("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrEvent, setQrEvent] = useState<EventOption | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const eventTitles = useMemo(
    () => Object.fromEntries(events.map((e) => [e.id, e.title])),
    [events]
  );

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, event_date")
      .order("event_date", { ascending: false })
      .then(({ data }) => setEvents((data as EventOption[]) || []));
  }, []);

  const load = async () => {
    setLoading(true);
    const startIso = start ? new Date(`${start}T00:00:00`).toISOString() : null;
    const endIso = end ? new Date(`${end}T23:59:59`).toISOString() : null;

    const [{ data: summaryData }, listResult] = await Promise.all([
      supabase.rpc("admin_event_feedback_summary", {
        _event_id: eventId === "all" ? null : eventId,
        _start: startIso,
        _end: endIso,
      }),
      (() => {
        let q = supabase
          .from("event_feedback")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        if (eventId !== "all") q = q.eq("event_id", eventId);
        if (startIso) q = q.gte("created_at", startIso);
        if (endIso) q = q.lte("created_at", endIso);
        return q;
      })(),
    ]);

    setSummary((summaryData as unknown as Summary) || null);
    setRows((listResult.data as FeedbackRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, start, end]);

  const feedbackUrl = (id: string) => `${window.location.origin}/feedback/${id}`;

  const openQr = async (ev: EventOption) => {
    setQrEvent(ev);
    const url = await QRCode.toDataURL(feedbackUrl(ev.id), {
      width: 900,
      margin: 2,
      color: { dark: "#1a1a1a", light: "#ffffff" },
    });
    setQrDataUrl(url);
  };

  const downloadQr = () => {
    if (!qrDataUrl || !qrEvent) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-feedback-${qrEvent.title.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const copyLink = async (id: string) => {
    await navigator.clipboard.writeText(feedbackUrl(id));
    toast({ title: "הקישור הועתק" });
  };

  const deleteRow = async (id: string) => {
    const { error } = await supabase.from("event_feedback").delete().eq("id", id);
    if (error) {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "התגובה נמחקה" });
    load();
  };

  const exportCsv = () => {
    const headers = [
      "תאריך",
      "אירוע",
      "דירוג הנאה",
      "הכיר אדם חדש",
      "כמה אנשים חדשים",
      "רוצה להישאר בקשר",
      "עם מי",
      "סיבת הגעה",
      "סוג מפגש מועדף",
      "רגע משמעותי",
      "מה לשפר",
      "סבירות להגעה הבאה",
      "המלצה (0-10)",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        new Date(r.created_at).toLocaleString("he-IL"),
        eventTitles[r.event_id] || r.event_id,
        r.enjoyment,
        r.met_new_person ? "כן" : "לא",
        r.new_people_count ?? "",
        r.keep_in_touch ? "כן" : "לא",
        r.keep_in_touch_name ?? "",
        r.attend_reason ?? "",
        r.preferred_meetup_type ?? "",
        r.meaningful_moment ?? "",
        r.improvement ?? "",
        r.next_event_likelihood ?? "",
        r.nps ?? "",
      ]
        .map(esc)
        .join(",")
    );
    const csv = "\uFEFF" + [headers.map(esc).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `event-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">משוב אירועים</h2>
          <p className="font-body text-sm text-muted-foreground">
            תגובות שנאספו דרך קוד ה-QR בסוף כל מפגש
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length} className="gap-2">
          <Download className="h-4 w-4" /> ייצוא CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">אירוע</label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל האירועים</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">מתאריך</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">עד תאריך</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard icon={MessageSquare} label="סך התגובות" value={String(summary?.total ?? 0)} />
            <StatCard
              icon={Star}
              label="ממוצע דירוג"
              value={summary?.avg_enjoyment ? `${summary.avg_enjoyment}/5` : "—"}
            />
            <StatCard
              icon={Users}
              label="הכירו מישהו חדש"
              value={`${summary?.met_new_pct ?? 0}%`}
              hint={summary?.avg_new_people ? `ממוצע ${summary.avg_new_people} אנשים` : undefined}
            />
            <StatCard icon={Repeat} label="רוצים לחזור" value={`${summary?.return_pct ?? 0}%`} />
            <StatCard
              icon={Star}
              label="ציון המלצה (NPS)"
              value={summary?.nps === null || summary?.nps === undefined ? "—" : String(summary.nps)}
              hint={summary?.avg_nps ? `ממוצע ${summary.avg_nps}/10` : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Preferred meetups */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-serif text-lg font-bold text-foreground">מפגשים מבוקשים להמשך</h3>
              {summary?.meetup_types?.length ? (
                <div className="space-y-2">
                  {summary.meetup_types.map((m) => {
                    const pct = summary.total ? Math.round((m.count / summary.total) * 100) : 0;
                    return (
                      <div key={m.name} className="space-y-1">
                        <div className="flex justify-between font-body text-sm">
                          <span className="text-muted-foreground">{m.count} ({pct}%)</span>
                          <span className="text-foreground">{m.name}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="font-body text-sm text-muted-foreground">אין נתונים עדיין</p>
              )}
            </div>

            {/* Attend reasons */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-serif text-lg font-bold text-foreground">סיבות ההגעה</h3>
              {summary?.attend_reasons?.length ? (
                <div className="space-y-2">
                  {summary.attend_reasons.map((m) => (
                    <div key={m.name} className="flex justify-between font-body text-sm">
                      <span className="text-muted-foreground">{m.count}</span>
                      <span className="text-foreground">{m.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="font-body text-sm text-muted-foreground">אין נתונים עדיין</p>
              )}
            </div>
          </div>

          {/* Trend by event */}
          {!!summary?.by_event?.length && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-serif text-lg font-bold text-foreground">מגמה לפי אירוע</h3>
              <div className="space-y-2">
                {summary.by_event.map((e) => (
                  <div key={e.event_id} className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0">
                    <span className="font-body text-sm text-primary">
                      {e.avg_enjoyment}/5 · {e.total} תגובות
                    </span>
                    <div className="min-w-0 text-right">
                      <p className="truncate font-body text-sm text-foreground">{e.title}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(e.event_date).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR codes per event */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-serif text-lg font-bold text-foreground">קודי QR לאירועים</h3>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2.5">
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openQr(e)}>
                      <QrCode className="h-4 w-4" /> QR
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPreviewEvent(e)}>
                      <Eye className="h-4 w-4" /> שאלון
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="העתק קישור" onClick={() => copyLink(e.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="min-w-0 text-right">
                    <p className="truncate font-body text-sm text-foreground">{e.title}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {new Date(e.event_date).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Responses */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-serif text-lg font-bold text-foreground">תגובות ({rows.length})</h3>
            {rows.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">עדיין לא התקבלו תגובות בטווח שנבחר</p>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-lg border border-border/60 p-3">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="מחיקת תגובה"
                        onClick={() => deleteRow(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <div className="min-w-0 text-right">
                        <p className="truncate font-body text-sm text-foreground">
                          {eventTitles[r.event_id] || "אירוע"}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("he-IL")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 font-body text-xs">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">הנאה {r.enjoyment}/5</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        {r.met_new_person ? `הכיר ${r.new_people_count ?? "?"} אנשים` : "לא הכיר חדשים"}
                      </span>
                      {r.keep_in_touch && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          רוצה קשר{r.keep_in_touch_name ? `: ${r.keep_in_touch_name}` : ""}
                        </span>
                      )}
                      {r.preferred_meetup_type && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                          {r.preferred_meetup_type}
                        </span>
                      )}
                      {r.nps !== null && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">המלצה {r.nps}/10</span>
                      )}
                    </div>
                    {(r.meaningful_moment || r.improvement) && (
                      <div className="mt-2 space-y-1 border-t border-border/50 pt-2 font-body text-sm text-muted-foreground">
                        {r.meaningful_moment && <p>רגע משמעותי: {r.meaningful_moment}</p>}
                        {r.improvement && <p>לשיפור: {r.improvement}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Dialog open={!!qrEvent} onOpenChange={(o) => !o && setQrEvent(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right font-serif">{qrEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`קוד QR למשוב על ${qrEvent?.title}`} className="mx-auto w-full rounded-xl bg-white p-3" />
            ) : (
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            )}
            <p className="break-all font-body text-xs text-muted-foreground">
              {qrEvent ? feedbackUrl(qrEvent.id) : ""}
            </p>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={downloadQr}>
                <Download className="h-4 w-4" /> הורדת הקוד
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => qrEvent && copyLink(qrEvent.id)}>
                <Copy className="h-4 w-4" /> העתקת קישור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEventFeedback;
