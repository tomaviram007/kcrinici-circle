import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Search, QrCode, Download, Loader2, CalendarDays, Repeat, Star,
  UserPlus, MessageSquare, Copy, ExternalLink,
} from "lucide-react";
import QRCode from "qrcode";

interface MemberRow {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  joined_at: string;
  status: string;
  membership_status: string;
  admin_notes: string | null;
  events_registered: number;
  events_attended: number;
  last_event_at: string | null;
  last_event_title: string | null;
  feedback_count: number;
  membership_interest: string | null;
  membership_fair_price: string | null;
  avatar_url: string | null;
}

interface EngagementRow {
  event_id: string;
  title: string;
  event_date: string;
  registered: number;
  attended: number;
  attendance_pct: number;
  new_attendees: number;
  returning_attendees: number;
  returning_pct: number;
  feedback_count: number;
  feedback_pct: number;
  avg_enjoyment: number | null;
  met_new_count: number;
  want_return_count: number;
}

const STATUS_LABEL: Record<string, string> = {
  member: "חבר מועדון",
  pending: "ממתין לאישור",
  guest: "אורח",
};

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString("he-IL") : "—");

const StatCell = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-background/50 p-2 text-center">
    <p className="font-serif text-lg font-bold text-foreground">{value}</p>
    <p className="font-body text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const AdminCommunityMembers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [engagement, setEngagement] = useState<EngagementRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [qr, setQr] = useState<{ title: string; url: string; image: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: m }, { data: e }] = await Promise.all([
      supabase.rpc("admin_community_members", { _search: null, _limit: 1000 }),
      supabase.rpc("admin_event_engagement", { _event_id: null, _limit: 60 }),
    ]);
    setMembers((m as any) || []);
    setEngagement((e as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!q) return true;
      return (
        m.full_name?.toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.phone || "").includes(q)
      );
    });
  }, [members, search, statusFilter]);

  const totals = useMemo(() => {
    const attended = members.filter((m) => m.events_attended > 0).length;
    const interested = members.filter((m) =>
      ["בהחלט כן", "כנראה שכן"].includes(m.membership_interest || "")
    ).length;
    return { all: members.length, attended, interested };
  }, [members]);

  const openMember = async (id: string) => {
    setDetailLoading(true);
    setDetail({ loading: true });
    const { data } = await supabase.rpc("admin_community_member_detail", { _member_id: id });
    setDetail(data as any);
    setNotes(((data as any)?.member?.admin_notes as string) || "");
    setDetailLoading(false);
  };

  const saveNotes = async () => {
    const id = detail?.member?.id;
    if (!id) return;
    const { error } = await supabase.from("community_members").update({ admin_notes: notes }).eq("id", id);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "ההערה נשמרה" });
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, admin_notes: notes } : m)));
  };

  const showQr = async (row: EngagementRow) => {
    const url = `${window.location.origin}/checkin/${row.event_id}`;
    const image = await QRCode.toDataURL(url, { width: 640, margin: 2 });
    setQr({ title: row.title, url, image });
  };

  const exportMembers = () => {
    const head = [
      "שם", "טלפון", "אימייל", "תאריך הצטרפות", "סטטוס",
      "נרשם לאירועים", "נכח באירועים", "אירוע אחרון", "עניין בחברות", "מחיר הוגן",
    ];
    const rows = filtered.map((m) => [
      m.full_name, m.phone || "", m.email || "", fmtDate(m.joined_at),
      STATUS_LABEL[m.status] || m.status, m.events_registered, m.events_attended,
      m.last_event_title || "", m.membership_interest || "", m.membership_fair_price || "",
    ]);
    const csv = "\uFEFF" + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `community-members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-5 text-right">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">חברי הקהילה</h2>
          <p className="font-body text-sm text-muted-foreground">
            {totals.all} אנשים · {totals.attended} נכחו באירוע · {totals.interested} מעוניינים בחברות שנתית
          </p>
        </div>
        <Button variant="outline" onClick={exportMembers} className="gap-2 font-body">
          <Download className="h-4 w-4" /> ייצוא CSV
        </Button>
      </div>

      <Tabs defaultValue="people" dir="rtl">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="people" className="font-body gap-1">
            <Users className="h-4 w-4" /> אנשים
          </TabsTrigger>
          <TabsTrigger value="events" className="font-body gap-1">
            <CalendarDays className="h-4 w-4" /> נתוני אירועים ונוכחות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="people" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם, טלפון או אימייל"
                className="h-11 pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="member">חבר מועדון</SelectItem>
                <SelectItem value="pending">ממתין לאישור</SelectItem>
                <SelectItem value="guest">אורח</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[820px] text-right">
              <thead>
                <tr className="border-b border-border font-body text-xs text-muted-foreground">
                  <th className="p-3">שם</th>
                  <th className="p-3">טלפון</th>
                  <th className="p-3">אימייל</th>
                  <th className="p-3">הצטרפות</th>
                  <th className="p-3">נרשם</th>
                  <th className="p-3">נכח</th>
                  <th className="p-3">אירוע אחרון</th>
                  <th className="p-3">סטטוס</th>
                  <th className="p-3">חברות שנתית</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => openMember(m.id)}
                    className="cursor-pointer border-b border-border/50 font-body text-sm transition-colors last:border-0 hover:bg-secondary/50"
                  >
                    <td className="p-3 font-medium text-foreground">{m.full_name || "—"}</td>
                    <td className="p-3 text-muted-foreground">{m.phone || "—"}</td>
                    <td className="p-3 text-muted-foreground">{m.email || "—"}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(m.joined_at)}</td>
                    <td className="p-3 text-foreground">{m.events_registered}</td>
                    <td className="p-3 text-foreground">{m.events_attended}</td>
                    <td className="p-3 text-muted-foreground">{m.last_event_title || "—"}</td>
                    <td className="p-3">
                      <span className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{m.membership_interest || "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center font-body text-sm text-muted-foreground">
                      לא נמצאו חברים
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4 space-y-3">
          <p className="font-body text-sm text-muted-foreground">
            לכל אירוע יש קוד QR לכניסה. מי שסורק אותו נרשם כנוכח, ומי שכבר סרק לא נספר פעמיים.
          </p>
          <div className="space-y-3">
            {engagement.map((row) => (
              <div key={row.event_id} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-foreground">{row.title}</h3>
                    <p className="font-body text-xs text-muted-foreground">{fmtDate(row.event_date)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => showQr(row)} className="gap-1 font-body text-xs">
                    <QrCode className="h-3.5 w-3.5" /> QR כניסה
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <StatCell label="נרשמים" value={String(row.registered)} />
                  <StatCell label="נכחו" value={String(row.attended)} />
                  <StatCell label="אחוז הגעה" value={`${row.attendance_pct}%`} />
                  <StatCell label="חדשים" value={String(row.new_attendees)} />
                  <StatCell label="חוזרים" value={`${row.returning_attendees} (${row.returning_pct}%)`} />
                  <StatCell label="מילאו שאלון" value={`${row.feedback_count} (${row.feedback_pct}%)`} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3 font-body text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-gold" /> דירוג ממוצע: {row.avg_enjoyment ?? "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5 text-gold" /> הכירו מישהו חדש: {row.met_new_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat className="h-3.5 w-3.5 text-gold" /> רוצים להגיע שוב: {row.want_return_count}
                  </span>
                </div>
              </div>
            ))}
            {engagement.length === 0 && (
              <p className="py-8 text-center font-body text-sm text-muted-foreground">אין אירועים להצגה</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Member detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent dir="rtl" className="max-h-[85vh] max-w-2xl overflow-y-auto text-right">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {detailLoading ? "טוען..." : detail?.member?.full_name || "כרטיס חבר"}
            </DialogTitle>
          </DialogHeader>
          {detail?.member && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-2 font-body text-sm sm:grid-cols-4">
                <StatCell label="נכח באירועים" value={String(detail.attendance?.length || 0)} />
                <StatCell label="נרשם לאירועים" value={String(detail.registrations?.length || 0)} />
                <StatCell label="תשובות לשאלון" value={String(detail.feedback?.length || 0)} />
                <StatCell label="הצטרף" value={fmtDate(detail.member.joined_at)} />
              </div>

              <div className="grid gap-2 font-body text-sm text-muted-foreground sm:grid-cols-2">
                <p>טלפון: {detail.member.phone || "—"}</p>
                <p>אימייל: {detail.member.email || "—"}</p>
                <p>סטטוס: {STATUS_LABEL[detail.member.status] || detail.member.status}</p>
                <p>חברות שנתית: {detail.member.membership_status === "none" ? "אין" : detail.member.membership_status}</p>
              </div>

              <section>
                <h4 className="mb-2 font-serif text-base font-bold text-foreground">היסטוריית אירועים</h4>
                <div className="space-y-1.5">
                  {(detail.attendance || []).map((a: any) => (
                    <div key={a.event_id} className="flex justify-between rounded-lg bg-secondary/50 px-3 py-2 font-body text-sm">
                      <span className="text-foreground">{a.title}</span>
                      <span className="text-muted-foreground">{fmtDate(a.event_date)}</span>
                    </div>
                  ))}
                  {(detail.attendance || []).length === 0 && (
                    <p className="font-body text-sm text-muted-foreground">עדיין לא סומנה נוכחות</p>
                  )}
                </div>
              </section>

              <section>
                <h4 className="mb-2 flex items-center gap-2 font-serif text-base font-bold text-foreground">
                  <MessageSquare className="h-4 w-4 text-gold" /> תשובות לשאלונים
                </h4>
                <div className="space-y-2">
                  {(detail.feedback || []).map((f: any) => (
                    <div key={f.id} className="rounded-lg border border-border p-3 font-body text-sm">
                      <div className="flex justify-between">
                        <span className="text-foreground">{f.title || "שאלון"}</span>
                        <span className="text-muted-foreground">{fmtDate(f.created_at)}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        דירוג {f.enjoyment}/5{f.nps !== null ? ` · המלצה ${f.nps}/10` : ""}
                        {f.membership_interest ? ` · חברות: ${f.membership_interest}` : ""}
                        {f.membership_fair_price ? ` · מחיר: ${f.membership_fair_price}` : ""}
                      </p>
                      {f.meaningful_moment && <p className="mt-1 text-muted-foreground">"{f.meaningful_moment}"</p>}
                    </div>
                  ))}
                  {(detail.feedback || []).length === 0 && (
                    <p className="font-body text-sm text-muted-foreground">אין תשובות</p>
                  )}
                </div>
              </section>

              <section>
                <h4 className="mb-2 font-serif text-base font-bold text-foreground">הערות מנהל</h4>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" />
                <Button onClick={saveNotes} className="mt-2 gradient-gold font-body text-primary-foreground">
                  שמור הערה
                </Button>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR dialog */}
      <Dialog open={!!qr} onOpenChange={(o) => !o && setQr(null)}>
        <DialogContent dir="rtl" className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{qr?.title}</DialogTitle>
          </DialogHeader>
          {qr && (
            <div className="space-y-3">
              <img src={qr.image} alt="QR כניסה לאירוע" className="mx-auto w-56 rounded-xl bg-white p-2" />
              <p className="break-all font-body text-xs text-muted-foreground">{qr.url}</p>
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 font-body text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(qr.url);
                    toast({ title: "הקישור הועתק" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> העתק קישור
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1 font-body text-xs">
                  <a href={qr.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> פתח
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild className="gap-1 font-body text-xs">
                  <a href={qr.image} download={`checkin-qr.png`}>
                    <Download className="h-3.5 w-3.5" /> הורד
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCommunityMembers;
