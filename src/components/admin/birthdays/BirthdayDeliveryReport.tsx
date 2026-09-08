import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, CheckCircle2, XCircle, Mail, Clock } from "lucide-react";

interface LogRow {
  id: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  sent_at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", hour12: false });

const BirthdayDeliveryReport = () => {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("birthday_email_log")
      .select("id, recipient_email, status, error_message, sent_at")
      .order("sent_at", { ascending: false })
      .limit(300);
    setRows((data || []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // מקבצים לפי "משלוח": רשומות שנשלחו בטווח של עד שעתיים מהרשומה האחרונה
  const batch = useMemo(() => {
    if (rows.length === 0) return null;
    const latest = new Date(rows[0].sent_at).getTime();
    const windowMs = 2 * 60 * 60 * 1000;
    const items = rows.filter((r) => latest - new Date(r.sent_at).getTime() <= windowMs);
    const sent = items.filter((r) => r.status === "sent").length;
    const failed = items.filter((r) => r.status === "failed").length;
    const other = items.length - sent - failed;
    return {
      items,
      sent,
      failed,
      other,
      total: items.length,
      rate: items.length ? Math.round((sent / items.length) * 100) : 0,
      startedAt: items[items.length - 1].sent_at,
      endedAt: items[0].sent_at,
    };
  }, [rows]);

  const failures = batch ? batch.items.filter((r) => r.status !== "sent") : [];

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">טוען...</div>;
  }

  if (!batch) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground" dir="rtl">
        עדיין לא נשלחו ברכות יום הולדת
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          המשלוח האחרון: {fmt(batch.startedAt)}
          {batch.total > 1 && <span> עד {fmt(batch.endedAt)}</span>}
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCcw className="h-4 w-4 ml-1" /> רענן
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Mail className="h-4 w-4" /> סה"כ נמענים
          </div>
          <p className="text-2xl font-bold tabular-nums">{batch.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> נשלחו בהצלחה
          </div>
          <p className="text-2xl font-bold tabular-nums text-green-600">{batch.sent}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <XCircle className="h-4 w-4 text-destructive" /> נכשלו
          </div>
          <p className="text-2xl font-bold tabular-nums text-destructive">{batch.failed + batch.other}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-muted-foreground text-xs mb-1">שיעור הצלחה</div>
          <p className="text-2xl font-bold tabular-nums text-gold">{batch.rate}%</p>
        </div>
      </div>

      <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex">
        <div className="h-full bg-green-600" style={{ width: `${batch.rate}%` }} />
        <div className="h-full bg-destructive" style={{ width: `${100 - batch.rate}%` }} />
      </div>

      {failures.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border text-sm font-medium">נמענים שלא קיבלו את הברכה</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs">
                <tr>
                  <th className="p-3 text-right">אימייל</th>
                  <th className="p-3 text-right">סטטוס</th>
                  <th className="p-3 text-right">סיבה</th>
                </tr>
              </thead>
              <tbody>
                {failures.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="p-3">{f.recipient_email}</td>
                    <td className="p-3">
                      <Badge variant={f.status === "failed" ? "destructive" : "secondary"}>{f.status}</Badge>
                    </td>
                    <td className="p-3 text-xs text-destructive">{f.error_message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BirthdayDeliveryReport;
