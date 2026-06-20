import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, MailX, Search, RotateCcw, Trash2 } from "lucide-react";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

interface MailingRow {
  user_id: string;
  email: string;
  full_name: string;
  is_approved: boolean;
  email_opt_in: boolean;
  is_suppressed: boolean;
  suppression_reason: string | null;
  suppressed_at: string | null;
}

interface SuppRow { id: string; email: string; reason: string; created_at: string; metadata: any }

export default function AdminMailingList() {
  const { toast } = useToast();
  const [members, setMembers] = useState<MailingRow[]>([]);
  const [suppressed, setSuppressed] = useState<SuppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [newEmail, setNewEmail] = useState("");

  async function load() {
    setLoading(true);
    const [m, s] = await Promise.all([
      supabase.rpc("admin_list_mailing_list"),
      supabase.from("suppressed_emails").select("*").order("created_at", { ascending: false }),
    ]);
    if (m.error) toast({ title: "שגיאה", description: m.error.message, variant: "destructive" });
    else setMembers((m.data as any[]) || []);
    if (!s.error) setSuppressed((s.data as any[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleOptIn(row: MailingRow, next: boolean) {
    const { error } = await supabase.rpc("admin_set_email_opt_in", {
      _user_id: row.user_id, _opt_in: next,
    });
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else {
      toast({ title: next ? "המנוי הופעל" : "המנוי בוטל" });
      load();
    }
  }

  async function suppress(email: string, reason = "admin_block") {
    const { error } = await supabase.from("suppressed_emails").upsert({
      email: email.toLowerCase(), reason: "unsubscribe", metadata: { source: "admin", note: reason },
    });
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else {
      // Also flip profile opt-in if exists
      const profile = members.find((m) => m.email.toLowerCase() === email.toLowerCase());
      if (profile) await supabase.rpc("admin_set_email_opt_in", { _user_id: profile.user_id, _opt_in: false });
      toast({ title: "האימייל נחסם" });
      setNewEmail("");
      load();
    }
  }

  async function removeSuppression(email: string) {
    const { error } = await supabase.rpc("admin_remove_suppression", { _email: email });
    if (error) toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    else { toast({ title: "האימייל הוסר מהחסימה" }); load(); }
  }

  const filtered = members.filter((m) => {
    const s = q.toLowerCase().trim();
    if (!s) return true;
    return m.email?.toLowerCase().includes(s) || m.full_name?.toLowerCase().includes(s);
  });

  const stats = {
    total: members.length,
    optIn: members.filter((m) => m.email_opt_in && !m.is_suppressed).length,
    optOut: members.filter((m) => !m.email_opt_in || m.is_suppressed).length,
    suppressed: suppressed.length,
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">ניהול רשימת תפוצה</h2>
        <p className="text-sm text-muted-foreground">
          נהלו מי מקבל מיילים מהמועדון. משתמשים שביקשו הסרה מופיעים כאן ולא יקבלו מיילים נוספים.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">סה"כ חברים</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">מנויים פעילים</div><div className="text-2xl font-bold text-green-600">{stats.optIn}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">לא מנויים</div><div className="text-2xl font-bold text-amber-600">{stats.optOut}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">חסומים</div><div className="text-2xl font-bold text-destructive">{stats.suppressed}</div></Card>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList>
          <TabsTrigger value="members">חברי המועדון</TabsTrigger>
          <TabsTrigger value="suppressed">רשימת חסומים</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4 space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם או אימייל" className="pr-9" />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">מנוי לדיוור</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">לא נמצאו תוצאות</TableCell></TableRow>
                ) : filtered.map((m) => (
                  <TableRow key={m.user_id}>
                    <TableCell className="font-medium">{m.full_name}</TableCell>
                    <TableCell className="text-xs">{m.email}</TableCell>
                    <TableCell>
                      {m.is_suppressed ? <Badge variant="destructive">חסום</Badge>
                        : m.email_opt_in ? <Badge className="bg-green-600">מנוי</Badge>
                        : <Badge variant="secondary">לא מנוי</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={m.email_opt_in && !m.is_suppressed}
                        disabled={m.is_suppressed}
                        onCheckedChange={(v) => toggleOptIn(m, v)}
                      />
                    </TableCell>
                    <TableCell>
                      {m.is_suppressed ? (
                        <Button size="sm" variant="outline" onClick={() => removeSuppression(m.email)}>
                          <RotateCcw className="w-3 h-3 ml-1" /> שחרור חסימה
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => suppress(m.email)}>
                          <MailX className="w-3 h-3 ml-1" /> חסום
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="suppressed" className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="text-sm font-medium mb-2">הוספה ידנית לרשימת החסומים</div>
            <div className="flex gap-2">
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button onClick={() => newEmail && suppress(newEmail)} disabled={!newEmail}>
                הוסף לחסומים
              </Button>
            </div>
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">סיבה</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פעולה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppressed.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">אין כתובות חסומות</TableCell></TableRow>
                ) : suppressed.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">{s.email}</TableCell>
                    <TableCell><Badge variant="outline">{s.reason}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("he-IL")}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => removeSuppression(s.email)}>
                        <Trash2 className="w-3 h-3 ml-1" /> הסר
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
