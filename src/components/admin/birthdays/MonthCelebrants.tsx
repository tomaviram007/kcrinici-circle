import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Cake, MessageCircle, AlertTriangle } from "lucide-react";
import WhatsappGreetingDialog from "./WhatsappGreetingDialog";

const HEBREW_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

interface BirthdayMember {
  user_id: string;
  first_name: string | null;
  full_name: string;
  display_name: string | null;
  email: string;
  phone: string | null;
  birth_date: string;
  send_birthday_email: boolean;
  email_opt_in: boolean;
  is_approved: boolean;
  show_in_birthday_list: boolean;
}

interface LogStatus {
  status: string;
  sent_at: string;
}

const statusBadge = (status?: string) => {
  if (!status) return <span className="text-muted-foreground text-xs">לא נשלח</span>;
  if (status === "sent") return <Badge className="bg-green-600 text-white">נשלח</Badge>;
  if (status === "failed") return <Badge variant="destructive">נכשל</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500 text-white">ממתין</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const MonthCelebrants = () => {
  const { toast } = useToast();
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [members, setMembers] = useState<BirthdayMember[]>([]);
  const [logs, setLogs] = useState<Record<string, LogStatus>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_birthdays_in_month", { _month: month });
    if (error) {
      toast({ title: "שגיאה בטעינת חוגגים", description: error.message, variant: "destructive" });
      setMembers([]);
      setLoading(false);
      return;
    }
    const rows = (data || []) as BirthdayMember[];
    rows.sort((a, b) => {
      const da = a.birth_date ? new Date(a.birth_date).getUTCDate() : 0;
      const db = b.birth_date ? new Date(b.birth_date).getUTCDate() : 0;
      return da - db;
    });
    setMembers(rows);

    // Pre-select approved + opt-in + email + send_birthday_email + show_in_list
    const pre = new Set<string>();
    rows.forEach((r) => {
      if (r.is_approved && r.email_opt_in && r.send_birthday_email && r.show_in_birthday_list) pre.add(r.user_id);
    });
    setSelected(pre);

    // Load this year's log
    const year = new Date().getFullYear();
    const ids = rows.map((r) => r.user_id);
    if (ids.length > 0) {
      const { data: logRows } = await supabase
        .from("birthday_email_log")
        .select("user_id, status, sent_at")
        .in("user_id", ids)
        .eq("sent_year", year);
      const map: Record<string, LogStatus> = {};
      for (const l of (logRows || []) as any[]) map[l.user_id] = { status: l.status, sent_at: l.sent_at };
      setLogs(map);
    } else {
      setLogs({});
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(members.map((m) => m.user_id)));
  const clearAll = () => setSelected(new Set());

  const selectedMembers = useMemo(
    () => members.filter((m) => selected.has(m.user_id)),
    [members, selected]
  );

  const handleCreateGreeting = () => {
    if (selectedMembers.length === 0) {
      toast({ title: "לא נבחרו חוגגים", description: "סמן/י לפחות חבר אחד", variant: "destructive" });
      return;
    }
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="flex items-end gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">בחר חודש</p>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v, 10))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEBREW_MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10 border border-gold/30">
            <Cake className="h-4 w-4 text-gold" />
            <span className="text-sm font-bold">{members.length} חוגגים בחודש {HEBREW_MONTHS[month - 1]}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} disabled={members.length === 0}>בחר את כולם</Button>
          <Button variant="outline" size="sm" onClick={clearAll} disabled={selected.size === 0}>נקה בחירה</Button>
          <Button onClick={handleCreateGreeting} className="gradient-gold text-primary-foreground gap-2">
            <MessageCircle className="h-4 w-4" />
            יצירת ברכה לחוגגי החודש
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">טוען...</div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          לא נמצאו חוגגים בחודש זה
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs">
                <tr>
                  <th className="p-3 text-right w-10"></th>
                  <th className="p-3 text-right">שם מלא</th>
                  <th className="p-3 text-right">תאריך</th>
                  <th className="p-3 text-right">טלפון</th>
                  <th className="p-3 text-right">אימייל</th>
                  <th className="p-3 text-right">סטטוס מייל השנה</th>
                  <th className="p-3 text-right">הערות</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const bd = new Date(m.birth_date);
                  const dd = String(bd.getUTCDate()).padStart(2, "0");
                  const mm = String(bd.getUTCMonth() + 1).padStart(2, "0");
                  const flags: string[] = [];
                  if (!m.is_approved) flags.push("לא מאושר");
                  if (!m.email_opt_in) flags.push("לא מאשר מיילים");
                  if (!m.send_birthday_email) flags.push("מייל יום הולדת כבוי");
                  if (!m.email) flags.push("חסר אימייל");
                  return (
                    <tr key={m.user_id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3">
                        <Checkbox checked={selected.has(m.user_id)} onCheckedChange={() => toggle(m.user_id)} />
                      </td>
                      <td className="p-3 font-medium">{m.display_name || m.full_name}</td>
                      <td className="p-3 tabular-nums">{dd}/{mm}</td>
                      <td className="p-3 text-muted-foreground tabular-nums">{m.phone || "—"}</td>
                      <td className="p-3 text-muted-foreground">{m.email || "—"}</td>
                      <td className="p-3">{statusBadge(logs[m.user_id]?.status)}</td>
                      <td className="p-3">
                        {flags.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            {flags.join(" · ")}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">תקין</span>
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

      <WhatsappGreetingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        month={month}
        monthName={HEBREW_MONTHS[month - 1]}
        members={selectedMembers.map((m) => ({
          name: m.display_name || m.first_name || m.full_name.split(" ")[0],
          fullName: m.full_name,
        }))}
      />
    </div>
  );
};

export default MonthCelebrants;
