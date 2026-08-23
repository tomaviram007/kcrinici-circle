import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, QrCode, Loader2, Star, Users, Repeat, MessageSquare, Trash2, Copy, Eye, ExternalLink, Plus, ClipboardList, AlertTriangle } from "lucide-react";
import QRCode from "qrcode";

interface EventOption {
  id: string;
  title: string;
  event_date: string;
}

interface StandaloneForm {
  id: string;
  title: string;
  description: string | null;
  form_date: string;
  is_active: boolean;
}

interface FeedbackRow {
  id: string;
  event_id: string | null;
  form_id: string | null;
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
  membership?: {
    respondents: number;
    positive_pct: number;
    interest: { name: string; count: number }[];
    prices: { name: string; count: number }[];
    benefits: { name: string; count: number }[];
    other_notes: string[];
    by_event: { event_id: string; title: string; respondents: number; positive_pct: number }[];
  } | null;
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
  const [previewEvent, setPreviewEvent] = useState<EventOption | null>(null);
  const [selectedForQuestionnaire, setSelectedForQuestionnaire] = useState<string>("");
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", location: "", description: "" });

  const [forms, setForms] = useState<StandaloneForm[]>([]);
  const [newForm, setNewForm] = useState({ title: "", description: "" });
  const [creatingForm, setCreatingForm] = useState(false);
  const [formToDelete, setFormToDelete] = useState<StandaloneForm | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleting, setDeleting] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const eventTitles = useMemo(
    () =>
      Object.fromEntries([
        ...events.map((e) => [e.id, e.title]),
        ...forms.map((f) => [f.id, `${f.title} (שאלון עצמאי)`]),
      ]),
    [events, forms]
  ) as Record<string, string>;

  const loadEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, title, event_date")
      .order("event_date", { ascending: false });
    const list = (data as EventOption[]) || [];
    setEvents(list);
    return list;
  };

  const loadForms = async () => {
    const { data } = await supabase
      .from("feedback_forms")
      .select("id, title, description, form_date, is_active")
      .order("created_at", { ascending: false });
    const list = (data as StandaloneForm[]) || [];
    setForms(list);
    return list;
  };

  useEffect(() => {
    void loadEvents();
    void loadForms();
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

  const createEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.date) {
      toast({ title: "יש למלא שם אירוע ותאריך", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || newEvent.title.trim(),
        location: newEvent.location.trim() || null,
        event_date: new Date(`${newEvent.date}T${newEvent.time || "19:00"}:00`).toISOString(),
        created_by: userData.user?.id ?? null,
      })
      .select("id, title, event_date")
      .single();
    setCreating(false);

    if (error || !data) {
      toast({ title: "שגיאה ביצירת האירוע", description: error?.message, variant: "destructive" });
      return;
    }

    await loadEvents();
    setNewEventOpen(false);
    setNewEvent({ title: "", date: "", time: "", location: "", description: "" });
    setSelectedForQuestionnaire(data.id);
    toast({ title: "האירוע נוצר והשאלון קושר אליו" });
    void openQr(data as EventOption);
  };

  const createForm = async () => {
    if (!newForm.title.trim()) {
      toast({ title: "יש למלא שם לשאלון", variant: "destructive" });
      return;
    }
    setCreatingForm(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("feedback_forms")
      .insert({
        title: newForm.title.trim(),
        description: newForm.description.trim() || null,
        created_by: userData.user?.id ?? null,
      })
      .select("id, title, description, form_date, is_active")
      .single();
    setCreatingForm(false);

    if (error || !data) {
      toast({ title: "שגיאה ביצירת השאלון", description: error?.message, variant: "destructive" });
      return;
    }

    await loadForms();
    setNewForm({ title: "", description: "" });
    toast({ title: "השאלון נפתח" });
    void openQr({ id: data.id, title: data.title, event_date: data.form_date });
  };

  const toggleForm = async (form: StandaloneForm) => {
    const { error } = await supabase
      .from("feedback_forms")
      .update({ is_active: !form.is_active })
      .eq("id", form.id);
    if (error) {
      toast({ title: "שגיאה בעדכון", description: error.message, variant: "destructive" });
      return;
    }
    await loadForms();
  };

  const confirmDeleteForm = async () => {
    if (!formToDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("feedback_forms").delete().eq("id", formToDelete.id);
    setDeleting(false);
    if (error) {
      toast({ title: "שגיאה במחיקת השאלון", description: error.message, variant: "destructive" });
      return;
    }
    setFormToDelete(null);
    setDeleteStep(1);
    if (eventId === formToDelete.id) setEventId("all");
    await loadForms();
    load();
    toast({ title: "השאלון נמחק" });
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
        eventTitles[(r.event_id || r.form_id) as string] || r.event_id || r.form_id,
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
          <label className="font-body text-xs text-muted-foreground">אירוע / שאלון</label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
              {forms.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.title} (שאלון עצמאי)
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

          {/* Annual membership interest */}
          <div className="rounded-xl border border-primary/40 bg-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-primary/15 px-3 py-1 font-body text-xs text-primary">
                {summary?.membership?.respondents ?? 0} משיבים
              </span>
              <h3 className="font-serif text-lg font-bold text-foreground">נכונות לחברות שנתית 🍻</h3>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background/40 p-3 text-right">
                <p className="font-body text-xs text-muted-foreground">מעוניינים (כן / כנראה שכן)</p>
                <p className="font-serif text-2xl font-bold text-primary">
                  {summary?.membership?.positive_pct ?? 0}%
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3 text-right">
                <p className="font-body text-xs text-muted-foreground">סה״כ משיבים לשאלון החברות</p>
                <p className="font-serif text-2xl font-bold text-foreground">
                  {summary?.membership?.respondents ?? 0}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {[
                { title: "נכונות להצטרף", rows: summary?.membership?.interest ?? [] },
                { title: "סכום שנתי הוגן", rows: summary?.membership?.prices ?? [] },
                { title: "הטבות מבוקשות", rows: summary?.membership?.benefits ?? [] },
              ].map((block) => {
                const base = summary?.membership?.respondents || 0;
                return (
                  <div key={block.title} className="rounded-xl border border-border bg-background/40 p-3">
                    <h4 className="mb-2 text-right font-body text-sm font-bold text-foreground">{block.title}</h4>
                    {block.rows.length ? (
                      <div className="space-y-2">
                        {block.rows.map((r) => {
                          const pct = base ? Math.round((r.count / base) * 100) : 0;
                          return (
                            <div key={r.name} className="space-y-1">
                              <div className="flex justify-between gap-2 font-body text-xs">
                                <span className="shrink-0 text-muted-foreground">{r.count} ({pct}%)</span>
                                <span className="text-right text-foreground">{r.name}</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-right font-body text-xs text-muted-foreground">אין נתונים עדיין</p>
                    )}
                  </div>
                );
              })}
            </div>

            {!!summary?.membership?.by_event?.length && (
              <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                <h4 className="mb-2 text-right font-body text-sm font-bold text-foreground">פילוח לפי אירוע</h4>
                <div className="space-y-1">
                  {summary.membership.by_event.map((e) => (
                    <div
                      key={e.event_id}
                      className="flex items-center justify-between gap-3 border-b border-border/50 py-1.5 last:border-0"
                    >
                      <span className="shrink-0 font-body text-sm text-primary">
                        {e.positive_pct}% · {e.respondents} משיבים
                      </span>
                      <span className="truncate text-right font-body text-sm text-foreground">{e.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!!summary?.membership?.other_notes?.length && (
              <div className="mt-4 rounded-xl border border-border bg-background/40 p-3">
                <h4 className="mb-2 text-right font-body text-sm font-bold text-foreground">תשובות "אחר"</h4>
                <div className="space-y-1">
                  {summary.membership.other_notes.map((n, i) => (
                    <p key={i} className="text-right font-body text-sm text-muted-foreground">• {n}</p>
                  ))}
                </div>
              </div>
            )}
          </div>



          {/* Open a questionnaire for an event */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNewEventOpen(true)}>
                <Plus className="h-4 w-4" /> אירוע חדש
              </Button>
              <h3 className="font-serif text-lg font-bold text-foreground">פתיחת שאלון לאירוע</h3>
            </div>

            {events.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 p-6 text-center">
                <p className="mb-3 font-body text-sm text-muted-foreground">
                  אין עדיין אירועים במערכת. אפשר לפתוח אירוע חדש ולקשר אליו שאלון משוב.
                </p>
                <Button className="gap-2" onClick={() => setNewEventOpen(true)}>
                  <Plus className="h-4 w-4" /> יצירת אירוע חדש
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={selectedForQuestionnaire} onValueChange={setSelectedForQuestionnaire}>
                  <SelectTrigger dir="rtl" className="text-right sm:flex-1">
                    <SelectValue placeholder="בחירת אירוע לקישור השאלון" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} — {new Date(e.event_date).toLocaleDateString("he-IL")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button
                    className="gap-1.5"
                    disabled={!selectedForQuestionnaire}
                    onClick={() => {
                      const ev = events.find((e) => e.id === selectedForQuestionnaire);
                      if (ev) void openQr(ev);
                    }}
                  >
                    <QrCode className="h-4 w-4" /> פתיחת שאלון
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    disabled={!selectedForQuestionnaire}
                    onClick={() => {
                      const ev = events.find((e) => e.id === selectedForQuestionnaire);
                      if (ev) setPreviewEvent(ev);
                    }}
                  >
                    <Eye className="h-4 w-4" /> תצוגה
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Standalone questionnaires */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-end gap-2">
              <h3 className="font-serif text-lg font-bold text-foreground">שאלון עצמאי (ללא אירוע)</h3>
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <p className="mb-3 font-body text-sm text-muted-foreground">
              שאלון שאינו מקושר לאירוע במערכת. מקבל קישור וקוד QR משלו.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                dir="rtl"
                placeholder="שם השאלון"
                className="text-right sm:flex-1"
                value={newForm.title}
                onChange={(e) => setNewForm((p) => ({ ...p, title: e.target.value }))}
              />
              <Input
                dir="rtl"
                placeholder="תיאור קצר (לא חובה)"
                className="text-right sm:flex-1"
                value={newForm.description}
                onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
              />
              <Button className="gap-1.5" disabled={creatingForm} onClick={createForm}>
                {creatingForm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                פתיחת שאלון
              </Button>
            </div>

            {forms.length > 0 && (
              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {forms.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2.5"
                  >
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => openQr({ id: f.id, title: f.title, event_date: f.form_date })}
                      >
                        <QrCode className="h-4 w-4" /> QR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setPreviewEvent({ id: f.id, title: f.title, event_date: f.form_date })}
                      >
                        <Eye className="h-4 w-4" /> שאלון
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="העתק קישור" onClick={() => copyLink(f.id)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-body text-xs"
                        onClick={() => toggleForm(f)}
                      >
                        {f.is_active ? "השהיה" : "הפעלה"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="מחיקת שאלון"
                        onClick={() => {
                          setDeleteStep(1);
                          setFormToDelete(f);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="truncate font-body text-sm text-foreground">{f.title}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(f.form_date).toLocaleDateString("he-IL")}
                        {!f.is_active && " · מושהה"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



          {/* QR codes per event */}
          {events.length > 0 && (
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
          )}


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
                          {eventTitles[(r.event_id || r.form_id) as string] || "שאלון"}
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

      <Dialog open={!!previewEvent} onOpenChange={(o) => !o && setPreviewEvent(null)}>
        <DialogContent dir="rtl" className="max-w-md p-4">
          <DialogHeader>
            <DialogTitle className="text-right font-serif">תצוגת השאלון — {previewEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            {previewEvent && (
              <iframe
                src={feedbackUrl(previewEvent.id)}
                title="תצוגה מקדימה של שאלון המשוב"
                className="h-[70vh] w-full"
              />
            )}
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => previewEvent && window.open(feedbackUrl(previewEvent.id), "_blank", "noopener")}
          >
            <ExternalLink className="h-4 w-4" /> פתיחה בכרטיסייה חדשה
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right font-serif">אירוע חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-right">
            <Input
              dir="rtl"
              placeholder="שם האירוע"
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent((p) => ({ ...p, date: e.target.value }))}
              />
              <Input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent((p) => ({ ...p, time: e.target.value }))}
              />
            </div>
            <Input
              dir="rtl"
              placeholder="מיקום (לא חובה)"
              value={newEvent.location}
              onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
            />
            <Input
              dir="rtl"
              placeholder="תיאור קצר (לא חובה)"
              value={newEvent.description}
              onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
            />
            <Button className="w-full gap-2" disabled={creating} onClick={createEvent}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              יצירת אירוע ופתיחת שאלון
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!formToDelete}
        onOpenChange={(o) => {
          if (!o) {
            setFormToDelete(null);
            setDeleteStep(1);
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-end gap-2 text-right font-serif">
              {deleteStep === 1 ? "מחיקת שאלון" : "אישור סופי"}
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-right">
            {deleteStep === 1 ? (
              <p className="font-body text-sm text-muted-foreground">
                למחוק את השאלון "{formToDelete?.title}"? הקישור וקוד ה-QR שלו יפסיקו לעבוד.
              </p>
            ) : (
              <p className="font-body text-sm text-muted-foreground">
                שאלה אחרונה: כל התשובות שנאספו בשאלון הזה יימחקו גם הן, ואי אפשר לשחזר אותן. להמשיך במחיקה?
              </p>
            )}
            <div className="flex gap-2">
              {deleteStep === 1 ? (
                <Button variant="destructive" className="flex-1" onClick={() => setDeleteStep(2)}>
                  כן, להמשיך
                </Button>
              ) : (
                <Button variant="destructive" className="flex-1 gap-2" disabled={deleting} onClick={confirmDeleteForm}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  מחיקה סופית
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFormToDelete(null);
                  setDeleteStep(1);
                }}
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>


  );
};

export default AdminEventFeedback;
