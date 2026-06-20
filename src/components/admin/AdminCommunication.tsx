import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Send, RefreshCw, Mail, MessageCircle, AlertCircle, CheckCircle2, Clock, Ban } from "lucide-react";

interface LogRow {
  message_id: string;
  template_name: string | null;
  recipient_email: string;
  status: string;
  error_message: string | null;
  metadata: any;
  created_at: string;
  total_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-green-500/15 text-green-600 border-green-500/30",
  failed: "bg-red-500/15 text-red-600 border-red-500/30",
  dlq: "bg-red-500/15 text-red-600 border-red-500/30",
  bounced: "bg-red-500/15 text-red-600 border-red-500/30",
  suppressed: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  complained: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  pending: "bg-blue-500/15 text-blue-600 border-blue-500/30",
};

const RANGES = [
  { id: "24h", label: "24 שעות", ms: 24 * 3600_000 },
  { id: "7d", label: "7 ימים", ms: 7 * 24 * 3600_000 },
  { id: "30d", label: "30 ימים", ms: 30 * 24 * 3600_000 },
];

const AdminCommunication = () => {
  const { toast } = useToast();

  // Send form
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  // WhatsApp form
  const [waPhone, setWaPhone] = useState("");
  const [waMsg, setWaMsg] = useState("");

  // Logs
  const [range, setRange] = useState("7d");
  const [status, setStatus] = useState<string>("all");
  const [template, setTemplate] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { start, end } = useMemo(() => {
    const e = new Date();
    const r = RANGES.find(x => x.id === range)!;
    return { start: new Date(e.getTime() - r.ms).toISOString(), end: e.toISOString() };
  }, [range]);

  const loadLogs = async () => {
    setLoading(true);
    const [{ data: rows }, { data: statRes }] = await Promise.all([
      supabase.rpc("admin_get_email_logs", {
        _start: start, _end: end,
        _template: template === "all" ? null : template,
        _status: status === "all" ? null : status,
        _search: search || null,
        _limit: pageSize, _offset: page * pageSize,
      }),
      supabase.rpc("admin_get_email_stats", { _start: start, _end: end }),
    ]);
    setLogs((rows as LogRow[]) || []);
    setStats(statRes);
    setLoading(false);
  };

  useEffect(() => { loadLogs(); /* eslint-disable-next-line */ }, [range, status, template, page]);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({ title: "חסרים שדות", description: "נמען, נושא וגוף ההודעה הם חובה", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("admin-send-email", {
      body: { to: to.split(",").map(s => s.trim()).filter(Boolean), subject, html: body.replace(/\n/g, "<br/>"), text: body },
    });
    setSending(false);
    if (error || !data?.ok) {
      toast({ title: "שליחה נכשלה", description: data?.esp?.message || data?.esp?.error || error?.message || "שגיאה לא ידועה", variant: "destructive" });
    } else {
      toast({ title: "✓ נשלח", description: `הודעה נשלחה ל-${to}` });
      setTo(""); setSubject(""); setBody("");
      loadLogs();
    }
  };

  const handleWhatsApp = () => {
    const clean = waPhone.replace(/\D/g, "").replace(/^0/, "972");
    if (!clean || !waMsg) {
      toast({ title: "חסרים שדות", description: "מספר טלפון והודעה הם חובה", variant: "destructive" });
      return;
    }
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(waMsg)}`, "_blank");
  };

  const templates: string[] = stats?.templates || [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-1">תקשורת</h2>
        <p className="font-body text-sm text-muted-foreground">שליחת מיילים וואטסאפ, ולוג שליחות מלא</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="send"><Mail className="h-4 w-4 ml-1" />מייל</TabsTrigger>
          <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 ml-1" />ואטסאפ</TabsTrigger>
          <TabsTrigger value="logs">לוגים</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
            <div>
              <Label>נמען (מייל, אפשר כמה מופרדים בפסיק)</Label>
              <Input value={to} onChange={e => setTo(e.target.value)} placeholder="user@example.com" type="email" />
            </div>
            <div>
              <Label>נושא</Label>
              <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="נושא ההודעה" />
            </div>
            <div>
              <Label>גוף ההודעה</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={8} placeholder="תוכן ההודעה..." />
              <p className="text-xs text-muted-foreground mt-1">שורות חדשות יהפכו ל-&lt;br/&gt; אוטומטית</p>
            </div>
            <Button onClick={handleSend} disabled={sending} className="bg-gold text-charcoal hover:bg-gold/90">
              <Send className="h-4 w-4 ml-2" />{sending ? "שולח..." : "שלח מייל"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 max-w-2xl">
            <div>
              <Label>מספר טלפון</Label>
              <Input value={waPhone} onChange={e => setWaPhone(e.target.value)} placeholder="050-1234567" dir="ltr" />
            </div>
            <div>
              <Label>הודעה</Label>
              <Textarea value={waMsg} onChange={e => setWaMsg(e.target.value)} rows={5} placeholder="תוכן ההודעה..." />
            </div>
            <Button onClick={handleWhatsApp} className="bg-green-600 text-white hover:bg-green-700">
              <MessageCircle className="h-4 w-4 ml-2" />פתח בוואטסאפ
            </Button>
            <p className="text-xs text-muted-foreground">פותח את WhatsApp עם הודעה מוכנה לשליחה</p>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Mail} label="סה״כ" value={stats?.total ?? 0} color="text-foreground" />
            <StatCard icon={CheckCircle2} label="נשלחו" value={stats?.sent ?? 0} color="text-green-600" />
            <StatCard icon={AlertCircle} label="נכשלו" value={stats?.failed ?? 0} color="text-red-600" />
            <StatCard icon={Ban} label="חסומים" value={stats?.suppressed ?? 0} color="text-yellow-600" />
            <StatCard icon={Clock} label="ממתינים" value={stats?.pending ?? 0} color="text-blue-600" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <Label className="text-xs">טווח זמן</Label>
              <Select value={range} onValueChange={v => { setPage(0); setRange(v); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{RANGES.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">סטטוס</Label>
              <Select value={status} onValueChange={v => { setPage(0); setStatus(v); }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="sent">נשלחו</SelectItem>
                  <SelectItem value="failed">נכשלו</SelectItem>
                  <SelectItem value="dlq">DLQ</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="suppressed">חסומים</SelectItem>
                  <SelectItem value="pending">ממתינים</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">תבנית</Label>
              <Select value={template} onValueChange={v => { setPage(0); setTemplate(v); }}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התבניות</SelectItem>
                  {templates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label className="text-xs">חיפוש (מייל/שגיאה)</Label>
              <Input value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (setPage(0), loadLogs())}
                placeholder="חפש..." />
            </div>
            <Button variant="outline" onClick={() => { setPage(0); loadLogs(); }} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-1 ${loading ? "animate-spin" : ""}`} />רענן
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-right">מועד</th>
                  <th className="px-3 py-2 text-right">תבנית</th>
                  <th className="px-3 py-2 text-right">נמען</th>
                  <th className="px-3 py-2 text-right">סטטוס</th>
                  <th className="px-3 py-2 text-right">שגיאה / מידע</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">טוען...</td></tr>}
                {!loading && logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">אין רשומות בטווח שנבחר</td></tr>}
                {logs.map(row => (
                  <tr key={row.message_id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap text-right">{new Date(row.created_at).toLocaleString("he-IL")}</td>
                    <td className="px-3 py-2 text-xs text-right">{row.template_name || "-"}</td>
                    <td className="px-3 py-2 text-xs text-right" dir="ltr">{row.recipient_email}</td>
                    <td className="px-3 py-2 text-right">
                      <Badge variant="outline" className={STATUS_COLORS[row.status] || ""}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-md text-right">
                      <div className="truncate" title={row.error_message || JSON.stringify(row.metadata)}>
                        {row.error_message || row.metadata?.subject || "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs[0] && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                מציג {page * pageSize + 1}–{page * pageSize + logs.length} מתוך {logs[0].total_count}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>הקודם</Button>
                <Button variant="outline" size="sm" disabled={(page + 1) * pageSize >= (logs[0].total_count || 0)} onClick={() => setPage(p => p + 1)}>הבא</Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="rounded-xl border border-border bg-card p-3 text-center">
    <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
    <p className={`font-serif text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default AdminCommunication;
