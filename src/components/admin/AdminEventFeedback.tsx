import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  QrCode,
  Loader2,
  Star,
  Users,
  Repeat,
  MessageSquare,
  Trash2,
  Copy,
  Eye,
  ExternalLink,
  Plus,
  ClipboardList,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
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

type DeleteTarget = { kind: "form" | "event"; id: string; title: string };

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

const Panel = ({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      {action}
      <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
        {title}
        {Icon && <Icon className="h-5 w-5 text-primary" />}
      </h3>
    </div>
    {children}
  </section>
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
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [search, setSearch] = useState("");

  const [forms, setForms] = useState<StandaloneForm[]>([]);
  const [newForm, setNewForm] = useState({ title: "", description: "" });
  const [creatingForm, setCreatingForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
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
        if (eventId !== "all") {
          const isStandaloneForm = forms.some((form) => form.id === eventId);
          q = q.eq(isStandaloneForm ? "form_id" : "event_id", eventId);
        }
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    if (deleteTarget.kind === "form") {
      const { error } = await supabase.from("feedback_forms").delete().eq("id", deleteTarget.id);
      setDeleting(false);
      if (error) {
        toast({ title: "שגיאה במחיקת השאלון", description: error.message, variant: "destructive" });
        return;
      }
      if (eventId === deleteTarget.id) setEventId("all");
      await loadForms();
    } else {
      const { error } = await supabase.from("event_feedback").delete().eq("event_id", deleteTarget.id);
      setDeleting(false);
      if (error) {
        toast({ title: "שגיאה במחיקת התשובות", description: error.message, variant: "destructive" });
        return;
      }
    }

    setDeleteTarget(null);
    setDeleteStep(1);
    load();
    toast({ title: deleteTarget.kind === "form" ? "השאלון נמחק" : "תשובות השאלון נמחקו" });
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

  const responseCounts = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const key = (r.event_id || r.form_id) as string;
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [rows]);

  const filteredForms = useMemo(
    () => forms.filter((f) => f.title.toLowerCase().includes(search.trim().toLowerCase())),
    [forms, search]
  );
  const filteredEvents = useMemo(
    () => events.filter((e) => e.title.toLowerCase().includes(search.trim().toLowerCase())),
    [events, search]
  );

  const QuestionnaireRow = ({
    id,
    title,
    date,
    badge,
    inactive,
    onToggle,
    onDelete,
    deleteLabel,
  }: {
    id: string;
    title: string;
    date: string;
    badge: string;
    inactive?: boolean;
    onToggle?: () => void;
    onDelete: () => void;
    deleteLabel: string;
  }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openQr({ id, title, event_date: date })}>
          <QrCode className="h-4 w-4" /> QR
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setPreviewEvent({ id, title, event_date: date })}
        >
          <Eye className="h-4 w-4" /> תצוגה
        </Button>
        <Button size="icon" variant="ghost" aria-label="העתקת קישור" onClick={() => copyLink(id)}>
          <Copy className="h-4 w-4" />
        </Button>
        {onToggle && (
          <Button size="sm" variant="ghost" className="font-body text-xs" onClick={onToggle}>
            {inactive ? "הפעלה" : "השהיה"}
          </Button>
        )}
        <Button size="icon" variant="ghost" aria-label={deleteLabel} onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      <div className="min-w-0 text-right">
        <p className="truncate font-body text-sm font-bold text-foreground">{title}</p>
        <p className="font-body text-xs text-muted-foreground">
          {new Date(date).toLocaleDateString("he-IL")} · {badge}
          {inactive && " · מושהה"}
        </p>
      </div>
    </div>
  );

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
      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="font-body text-xs text-muted-foreground">אירוע / שאלון</label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger dir="rtl" className="text-right">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
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
        <Tabs defaultValue="overview" dir="rtl" className="space-y-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">סקירה</TabsTrigger>
            <TabsTrigger value="forms">ניהול שאלונים</TabsTrigger>
            <TabsTrigger value="responses">תגובות ({rows.length})</TabsTrigger>
          </TabsList>

          {/* ===== Overview ===== */}
          <TabsContent value="overview" className="space-y-5">
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
              <Panel title="מפגשים מבוקשים להמשך">
                {summary?.meetup_types?.length ? (
                  <div className="space-y-2">
                    {summary.meetup_types.map((m) => {
                      const pct = summary.total ? Math.round((m.count / summary.total) * 100) : 0;
                      return (
                        <div key={m.name} className="space-y-1">
                          <div className="flex justify-between font-body text-sm">
                            <span className="text-muted-foreground">
                              {m.count} ({pct}%)
                            </span>
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
              </Panel>

              <Panel title="סיבות ההגעה">
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
              </Panel>
            </div>

            {!!summary?.by_event?.length && (
              <Panel title="מגמה לפי אירוע">
                <div className="space-y-2">
                  {summary.by_event.map((e) => (
                    <div
                      key={e.event_id}
                      className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0"
                    >
                      <span className="shrink-0 font-body text-sm text-primary">
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
              </Panel>
            )}

            {/* Annual membership */}
            <section className="rounded-2xl border border-primary/40 bg-card p-4 sm:p-5">
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
                                  <span className="shrink-0 text-muted-foreground">
                                    {r.count} ({pct}%)
                                  </span>
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
                      <p key={i} className="text-right font-body text-sm text-muted-foreground">
                        • {n}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </TabsContent>

          {/* ===== Questionnaire management ===== */}
          <TabsContent value="forms" className="space-y-5">
            <Panel
              title="פתיחת שאלון חדש"
              icon={ClipboardList}
              action={
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setNewEventOpen(true)}>
                  <Plus className="h-4 w-4" /> אירוע חדש + שאלון
                </Button>
              }
            >
              <p className="mb-3 font-body text-sm text-muted-foreground">
                שאלון עצמאי אינו מקושר לאירוע במערכת ומקבל קישור וקוד QR משלו.
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  dir="rtl"
                  placeholder="שם השאלון"
                  className="text-right"
                  value={newForm.title}
                  onChange={(e) => setNewForm((p) => ({ ...p, title: e.target.value }))}
                />
                <Input
                  dir="rtl"
                  placeholder="תיאור קצר (לא חובה)"
                  className="text-right"
                  value={newForm.description}
                  onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
                />
                <Button className="gap-1.5" disabled={creatingForm} onClick={createForm}>
                  {creatingForm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  פתיחת שאלון
                </Button>
              </div>
            </Panel>

            <Input
              dir="rtl"
              placeholder="חיפוש שאלון או אירוע..."
              className="text-right"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Panel title={`שאלונים עצמאיים (${filteredForms.length})`} icon={ClipboardList}>
              {filteredForms.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">אין שאלונים עצמאיים להצגה</p>
              ) : (
                <div className="space-y-2">
                  {filteredForms.map((f) => (
                    <QuestionnaireRow
                      key={f.id}
                      id={f.id}
                      title={f.title}
                      date={f.form_date}
                      badge={`${responseCounts[f.id] || 0} תגובות`}
                      inactive={!f.is_active}
                      onToggle={() => toggleForm(f)}
                      deleteLabel="מחיקת שאלון"
                      onDelete={() => {
                        setDeleteStep(1);
                        setDeleteTarget({ kind: "form", id: f.id, title: f.title });
                      }}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel title={`שאלונים לאירועים (${filteredEvents.length})`} icon={CalendarDays}>
              {filteredEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                  <p className="mb-3 font-body text-sm text-muted-foreground">אין אירועים להצגה</p>
                  <Button className="gap-2" onClick={() => setNewEventOpen(true)}>
                    <Plus className="h-4 w-4" /> יצירת אירוע חדש
                  </Button>
                </div>
              ) : (
                <div className="max-h-[28rem] space-y-2 overflow-y-auto pl-1">
                  {filteredEvents.map((e) => (
                    <QuestionnaireRow
                      key={e.id}
                      id={e.id}
                      title={e.title}
                      date={e.event_date}
                      badge={`${responseCounts[e.id] || 0} תגובות`}
                      deleteLabel="מחיקת תשובות השאלון"
                      onDelete={() => {
                        setDeleteStep(1);
                        setDeleteTarget({ kind: "event", id: e.id, title: e.title });
                      }}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </TabsContent>

          {/* ===== Responses ===== */}
          <TabsContent value="responses">
            <Panel title={`תגובות (${rows.length})`} icon={MessageSquare}>
              {rows.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">עדיין לא התקבלו תגובות בטווח שנבחר</p>
              ) : (
                <div className="space-y-3">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <Button size="icon" variant="ghost" aria-label="מחיקת תגובה" onClick={() => deleteRow(r.id)}>
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
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                          הנאה {r.enjoyment}/5
                        </span>
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
                          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                            המלצה {r.nps}/10
                          </span>
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
            </Panel>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!qrEvent} onOpenChange={(o) => !o && setQrEvent(null)}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-right font-serif">{qrEvent?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`קוד QR למשוב על ${qrEvent?.title}`}
                className="mx-auto w-full rounded-xl bg-white p-3"
              />
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
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setDeleteStep(1);
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-end gap-2 text-right font-serif">
              {deleteStep === 1 ? (deleteTarget?.kind === "form" ? "מחיקת שאלון" : "מחיקת תשובות") : "אישור סופי"}
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-right">
            {deleteStep === 1 ? (
              <p className="font-body text-sm text-muted-foreground">
                {deleteTarget?.kind === "form"
                  ? `למחוק את השאלון "${deleteTarget?.title}"? הקישור וקוד ה-QR שלו יפסיקו לעבוד.`
                  : `למחוק את כל התשובות שנאספו בשאלון של "${deleteTarget?.title}"? האירוע עצמו יישאר במערכת.`}
              </p>
            ) : (
              <p className="font-body text-sm text-muted-foreground">
                שאלה אחרונה: כל התשובות שנאספו יימחקו לצמיתות ואי אפשר לשחזר אותן. להמשיך במחיקה?
              </p>
            )}
            <div className="flex gap-2">
              {deleteStep === 1 ? (
                <Button variant="destructive" className="flex-1" onClick={() => setDeleteStep(2)}>
                  כן, להמשיך
                </Button>
              ) : (
                <Button variant="destructive" className="flex-1 gap-2" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  מחיקה סופית
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setDeleteTarget(null);
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
