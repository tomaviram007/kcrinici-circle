import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Send, RefreshCcw } from "lucide-react";

interface LogRow {
  id: string;
  user_id: string;
  recipient_email: string;
  sent_year: number;
  status: string;
  error_message: string | null;
  sent_at: string;
  name?: string;
  birth_date?: string;
}

const statusBadge = (status: string) => {
  if (status === "sent") return <Badge className="bg-green-600 text-white">נשלח בהצלחה</Badge>;
  if (status === "failed") return <Badge variant="destructive">נכשל</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500 text-white">ממתין</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const BirthdayHistory = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [confirmRow, setConfirmRow] = useState<LogRow | null>(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: logs } = await supabase
      .from("birthday_email_log")
      .select("*")
      .eq("sent_year", parseInt(year, 10))
      .order("sent_at", { ascending: false });

    const ids = Array.from(new Set((logs || []).map((l: any) => l.user_id)));
    let profMap: Record<string, { full_name: string; birth_date: string }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, birth_date")
        .in("user_id", ids);
      for (const p of (profs || []) as any[]) {
        profMap[p.user_id] = { full_name: p.full_name, birth_date: p.birth_date };
      }
    }

    setRows(
      ((logs || []) as any[]).map((l) => ({
        ...l,
        name: profMap[l.user_id]?.full_name || "—",
        birth_date: profMap[l.user_id]?.birth_date || "",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.recipient_email.toLowerCase().includes(q) && !(r.name || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  const handleResend = async (r: LogRow) => {
    setSending(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const projectUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const resp = await fetch(`${projectUrl}/functions/v1/send-birthday-emails?force=1&resend=1&user_id=${encodeURIComponent(r.user_id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok || (body.sent || 0) === 0) {
        toast({
          title: body.sent > 0 ? "נשלח" : "השליחה נכשלה",
          description: body?.errors?.[0]?.error || body?.error || (body.total_candidates === 0 ? "החבר לא מתאים לשליחה (אישור/opt-in/אימייל)" : "ראה לוגים"),
          variant: body.sent > 0 ? undefined : "destructive",
        });
      } else {
        toast({ title: "המייל נשלח בהצלחה" });
      }
      await load();
    } catch (e: any) {
      toast({ title: "שגיאה", description: e?.message || String(e), variant: "destructive" });
    }
    setSending(false);
    setConfirmRow(null);
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">שנה</p>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">סטטוס</p>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="sent">נשלח בהצלחה</SelectItem>
                <SelectItem value="failed">נכשל</SelectItem>
                <SelectItem value="pending">ממתין</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">חיפוש</p>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="שם או אימייל" className="w-56" />
          </div>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCcw className="h-4 w-4 ml-1" /> רענן
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          אין רשומות להצגה
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs">
                <tr>
                  <th className="p-3 text-right">שם חבר</th>
                  <th className="p-3 text-right">תאריך לידה</th>
                  <th className="p-3 text-right">תאריך שליחה</th>
                  <th className="p-3 text-right">אימייל</th>
                  <th className="p-3 text-right">סטטוס</th>
                  <th className="p-3 text-right">סיבת כישלון</th>
                  <th className="p-3 text-right">שנה</th>
                  <th className="p-3 text-right">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const bd = r.birth_date ? new Date(r.birth_date) : null;
                  const bdStr = bd ? `${String(bd.getUTCDate()).padStart(2, "0")}/${String(bd.getUTCMonth() + 1).padStart(2, "0")}` : "—";
                  const dt = new Date(r.sent_at);
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 tabular-nums">{bdStr}</td>
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {dt.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", hour12: false })}
                      </td>
                      <td className="p-3 text-muted-foreground">{r.recipient_email}</td>
                      <td className="p-3">{statusBadge(r.status)}</td>
                      <td className="p-3 text-xs text-destructive max-w-[200px] truncate" title={r.error_message || ""}>
                        {r.error_message || "—"}
                      </td>
                      <td className="p-3 tabular-nums">{r.sent_year}</td>
                      <td className="p-3">
                        {r.status !== "sent" && (
                          <Button size="sm" variant="outline" onClick={() => setConfirmRow(r)}>
                            <Send className="h-3 w-3 ml-1" /> שלח עכשיו
                          </Button>
                        )}
                        {r.status === "sent" && (
                          <Button size="sm" variant="ghost" onClick={() => setConfirmRow(r)}>
                            <RefreshCcw className="h-3 w-3 ml-1" /> שליחה חוזרת
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmRow} onOpenChange={(o) => !o && setConfirmRow(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אישור שליחה</AlertDialogTitle>
            <AlertDialogDescription>
              לשלוח את ברכת יום ההולדת ל-{confirmRow?.name} ({confirmRow?.recipient_email})?
              {confirmRow?.status === "sent" && (
                <span className="block mt-2 text-amber-700">
                  שים לב: כבר נשלח השנה. פעולה זו תשלח שוב ותדרוס את הרשומה הקיימת.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction disabled={sending} onClick={() => confirmRow && handleResend(confirmRow)}>
              {sending ? "שולח..." : "שלח"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BirthdayHistory;
