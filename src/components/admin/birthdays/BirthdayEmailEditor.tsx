import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Send, Eye } from "lucide-react";

interface Template {
  id?: string;
  subject: string;
  body_html: string;
  preview_text: string;
  heading: string;
  signature: string;
  from_name: string;
  reply_to: string;
  logo_url: string;
  bg_color: string;
  text_color: string;
  button_color: string;
  is_active: boolean;
}

const DEFAULTS: Template = {
  subject: "{{first_name}}, יום הולדת שמח! 🎉",
  body_html: "<p>{{first_name}} היקר,</p><p>מאחלים לך יום הולדת שמח, בריאות, שמחה והרבה הצלחה.</p>",
  preview_text: "מזל טוב מ-{{club_name}}",
  heading: "{{first_name}}, יום הולדת שמח! 🎉",
  signature: "באהבה,\n{{club_name}}",
  from_name: "מועדון הגברים של ק.קרניצי",
  reply_to: "",
  logo_url: "",
  bg_color: "#16110e",
  text_color: "#f6f0e6",
  button_color: "#D4AF37",
  is_active: true,
};

const render = (tpl: string, vars: Record<string, string>) =>
  (tpl || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");

const BirthdayEmailEditor = () => {
  const { toast } = useToast();
  const [tpl, setTpl] = useState<Template>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("birthday_email_template")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (data) setTpl({ ...DEFAULTS, ...(data as any) });
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user?.email) setTestEmail(auth.user.email);
      setLoading(false);
    })();
  }, []);

  const previewVars = useMemo(() => ({
    first_name: "רונן",
    last_name: "כהן",
    full_name: "רונן כהן",
    birthday_date: "08/06",
    club_name: "מועדון הגברים של ק.קרניצי",
    current_year: String(new Date().getFullYear()),
  }), []);

  const previewHtml = useMemo(() => {
    const bg = tpl.bg_color || "#16110e";
    const text = tpl.text_color || "#f6f0e6";
    const btn = tpl.button_color || "#D4AF37";
    const heading = render(tpl.heading, previewVars);
    const body = render(tpl.body_html, previewVars);
    const signature = render(tpl.signature, previewVars).replace(/\n/g, "<br/>");
    const logo = tpl.logo_url;
    return `<!DOCTYPE html><html dir="rtl"><body style="margin:0;background:#fff;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;padding:24px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${bg};color:${text};border-radius:16px;overflow:hidden;border:1px solid ${btn}33;">
${logo ? `<tr><td align="center" style="padding:28px 24px 0;"><img src="${logo}" alt="" style="max-width:140px;height:auto;display:block;"/></td></tr>` : ""}
${heading ? `<tr><td align="center" style="padding:24px 24px 8px;font-size:26px;font-weight:700;color:${text};">${heading}</td></tr>` : ""}
<tr><td style="padding:16px 28px 24px;font-size:16px;line-height:1.7;color:${text};">${body}</td></tr>
${signature ? `<tr><td style="padding:0 28px 28px;font-size:14px;color:${text};opacity:.85;border-top:1px solid ${btn}33;padding-top:18px;">${signature}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
  }, [tpl, previewVars]);

  const setField = <K extends keyof Template>(k: K, v: Template[K]) => setTpl((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...tpl, updated_at: new Date().toISOString() };
    let res;
    if (tpl.id) {
      res = await supabase.from("birthday_email_template").update(payload).eq("id", tpl.id);
    } else {
      res = await supabase.from("birthday_email_template").insert(payload);
    }
    setSaving(false);
    if (res.error) {
      toast({ title: "שמירה נכשלה", description: res.error.message, variant: "destructive" });
    } else {
      toast({ title: "התבנית נשמרה בהצלחה" });
    }
  };

  const sendTest = async () => {
    if (!testEmail) {
      toast({ title: "נא להזין אימייל", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    // Save first so the function reads latest fields
    await save();
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const projectUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "";
      const finalUrl = `${projectUrl}/functions/v1/send-birthday-emails?test=1&to=${encodeURIComponent(testEmail)}`;
      const resp = await fetch(finalUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast({ title: "שליחה נכשלה", description: body?.error || body?.message || `HTTP ${resp.status}`, variant: "destructive" });
      } else {
        toast({ title: "מייל בדיקה נשלח בהצלחה", description: `אל ${testEmail}` });
      }
    } catch (e: any) {
      toast({ title: "שגיאה", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">טוען...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" dir="rtl">
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold">עריכת תבנית מייל</h3>
          <div className="flex items-center gap-2">
            <Label className="text-xs">פעיל</Label>
            <Switch checked={tpl.is_active} onCheckedChange={(v) => setField("is_active", v)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label>נושא</Label>
            <Input value={tpl.subject} onChange={(e) => setField("subject", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>טקסט תצוגה מקדימה</Label>
            <Input value={tpl.preview_text} onChange={(e) => setField("preview_text", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>כותרת ראשית</Label>
            <Input value={tpl.heading} onChange={(e) => setField("heading", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>גוף הברכה (HTML)</Label>
            <Textarea rows={6} value={tpl.body_html} onChange={(e) => setField("body_html", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>חתימה</Label>
            <Textarea rows={3} value={tpl.signature} onChange={(e) => setField("signature", e.target.value)} />
          </div>
          <div>
            <Label>שם השולח</Label>
            <Input value={tpl.from_name} onChange={(e) => setField("from_name", e.target.value)} />
          </div>
          <div>
            <Label>כתובת תשובה (Reply-To)</Label>
            <Input value={tpl.reply_to} onChange={(e) => setField("reply_to", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>לוגו / תמונה (URL)</Label>
            <Input value={tpl.logo_url} onChange={(e) => setField("logo_url", e.target.value)} />
          </div>
          <div>
            <Label>צבע רקע</Label>
            <Input type="color" value={tpl.bg_color} onChange={(e) => setField("bg_color", e.target.value)} className="h-10 p-1" />
          </div>
          <div>
            <Label>צבע טקסט</Label>
            <Input type="color" value={tpl.text_color} onChange={(e) => setField("text_color", e.target.value)} className="h-10 p-1" />
          </div>
          <div>
            <Label>צבע כפתורים</Label>
            <Input type="color" value={tpl.button_color} onChange={(e) => setField("button_color", e.target.value)} className="h-10 p-1" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-secondary/40 rounded-lg p-2">
          משתנים זמינים: <code>{`{{first_name}}`}</code> · <code>{`{{last_name}}`}</code> · <code>{`{{full_name}}`}</code> · <code>{`{{birthday_date}}`}</code> · <code>{`{{club_name}}`}</code> · <code>{`{{current_year}}`}</code>
        </div>

        <div className="flex flex-wrap items-end gap-2 pt-2">
          <div className="flex-1 min-w-[200px]">
            <Label>אימייל לבדיקה</Label>
            <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button variant="outline" onClick={sendTest} disabled={sendingTest}>
            <Send className="h-4 w-4 ml-1" /> {sendingTest ? "שולח..." : "שלח מייל בדיקה"}
          </Button>
          <Button onClick={save} disabled={saving} className="gradient-gold text-primary-foreground">
            <Save className="h-4 w-4 ml-1" /> {saving ? "שומר..." : "שמור תבנית"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-gold" />
          <h3 className="font-serif text-lg font-bold">תצוגה מקדימה</h3>
          <span className="text-xs text-muted-foreground">(עם נתוני דמה)</span>
        </div>
        <iframe
          title="email-preview"
          srcDoc={previewHtml}
          className="w-full h-[600px] rounded-lg border border-border bg-white"
        />
      </div>
    </div>
  );
};

export default BirthdayEmailEditor;
