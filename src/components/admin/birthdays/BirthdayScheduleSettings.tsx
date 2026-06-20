import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save, Play } from "lucide-react";

const KEYS = [
  "birthday_send_hour",
  "birthday_leap_mode",
  "birthday_whatsapp_template",
  "birthday_whatsapp_target_type",
  "birthday_whatsapp_manager_phone",
  "birthday_whatsapp_group_url",
  "club_name",
] as const;

const BirthdayScheduleSettings = () => {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningManual, setRunningManual] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", KEYS as unknown as string[]);
      const map: Record<string, string> = {};
      for (const r of (data || []) as any[]) map[r.key] = r.value || "";
      setValues(map);
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    // upsert each key
    for (const k of KEYS) {
      const value = values[k] ?? "";
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", k).maybeSingle();
      if (existing) {
        await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", k);
      } else {
        await supabase.from("site_settings").insert({ key: k, value });
      }
    }
    setSaving(false);
    toast({ title: "ההגדרות נשמרו" });
  };

  const runManual = async () => {
    setRunningManual(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const projectUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      const resp = await fetch(`${projectUrl}/functions/v1/send-birthday-emails?force=1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast({ title: "ההפעלה נכשלה", description: body?.error || `HTTP ${resp.status}`, variant: "destructive" });
      } else {
        toast({
          title: "ההפעלה הושלמה",
          description: `נשלחו: ${body.sent || 0} · דולג: ${body.skipped_already_sent || 0} · נכשלו: ${body.failed || 0}`,
        });
      }
    } catch (e: any) {
      toast({ title: "שגיאה", description: e?.message || String(e), variant: "destructive" });
    }
    setRunningManual(false);
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">טוען...</div>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h3 className="font-serif text-lg font-bold">הגדרות תזמון</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>שעת שליחה (24h, שעון ישראל)</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={values.birthday_send_hour || "8"}
              onChange={(e) => set("birthday_send_hour", e.target.value)}
            />
          </div>
          <div>
            <Label>שם המועדון (משמש ב-{`{{club_name}}`})</Label>
            <Input value={values.club_name || ""} onChange={(e) => set("club_name", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>התנהגות 29/2 בשנה שאינה מעוברת</Label>
            <Select value={values.birthday_leap_mode || "feb_28"} onValueChange={(v) => set("birthday_leap_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="feb_28">לשלוח ב-28 בפברואר</SelectItem>
                <SelectItem value="mar_1">לשלוח ב-1 במרץ</SelectItem>
                <SelectItem value="skip">לא לשלוח באותה שנה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h3 className="font-serif text-lg font-bold">ברכת WhatsApp חודשית — תבנית ויעד</h3>
        <div className="space-y-3">
          <div>
            <Label>תבנית הברכה</Label>
            <Textarea
              rows={6}
              value={values.birthday_whatsapp_template || ""}
              onChange={(e) => set("birthday_whatsapp_template", e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              משתנים: <code>{`{{month_name}}`}</code> · <code>{`{{birthday_names}}`}</code> · <code>{`{{birthday_count}}`}</code> · <code>{`{{club_name}}`}</code>
            </p>
          </div>
          <div>
            <Label>יעד ההודעה</Label>
            <Select value={values.birthday_whatsapp_target_type || "clipboard"} onValueChange={(v) => set("birthday_whatsapp_target_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="clipboard">העתקה ללוח בלבד</SelectItem>
                <SelectItem value="manager_phone">מספר טלפון של מנהל המועדון</SelectItem>
                <SelectItem value="group_url">קישור לקבוצת WhatsApp</SelectItem>
                <SelectItem value="open">פתיחת WhatsApp ללא יעד קבוע</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>טלפון מנהל</Label>
              <Input
                value={values.birthday_whatsapp_manager_phone || ""}
                onChange={(e) => set("birthday_whatsapp_manager_phone", e.target.value)}
                placeholder="05XXXXXXXX"
              />
            </div>
            <div>
              <Label>קישור לקבוצה</Label>
              <Input
                value={values.birthday_whatsapp_group_url || ""}
                onChange={(e) => set("birthday_whatsapp_group_url", e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={runManual} disabled={runningManual}>
          <Play className="h-4 w-4 ml-1" /> {runningManual ? "מריץ..." : "הפעל בדיקה ידנית עכשיו"}
        </Button>
        <Button onClick={save} disabled={saving} className="gradient-gold text-primary-foreground">
          <Save className="h-4 w-4 ml-1" /> {saving ? "שומר..." : "שמור הגדרות"}
        </Button>
      </div>
    </div>
  );
};

export default BirthdayScheduleSettings;
