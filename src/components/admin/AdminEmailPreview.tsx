import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smartphone, Monitor, RefreshCw, Save, MessageCircle, Star, Reply, Forward, MoreVertical, Inbox } from "lucide-react";

const TEMPLATES = [
  { id: "signup", label: "אישור הרשמה", subject: "ברוך הבא, אישור הרשמה לאנשי ק.קרניצי", preview: "תודה שנרשמת. אשר את כתובת המייל כדי להשלים את ההרשמה." },
  { id: "magiclink", label: "קישור כניסה (Magic Link)", subject: "קישור כניסה מאובטח לאתר", preview: "לחץ על הקישור כדי להתחבר ללא סיסמה." },
  { id: "recovery", label: "איפוס סיסמה", subject: "בקשה לאיפוס סיסמה", preview: "קיבלנו בקשה לאפס את הסיסמה שלך." },
  { id: "invite", label: "הזמנה להצטרף", subject: "הוזמנת להצטרף לאנשי ק.קרניצי", preview: "קבלת הזמנה אישית להצטרף לקהילה." },
  { id: "email_change", label: "החלפת כתובת אימייל", subject: "אישור החלפת כתובת אימייל", preview: "אנא אשר את החלפת כתובת המייל בחשבונך." },
  { id: "reauthentication", label: "קוד אימות (OTP)", subject: "קוד אימות לחשבון שלך", preview: "השתמש בקוד החד-פעמי כדי להמשיך." },
];

const FUNCTIONS_URL = `${(import.meta as any).env.VITE_SUPABASE_URL || ""}/functions/v1/admin-preview-email`;
const SENDER_NAME = "אנשי ק.קרניצי";
const SENDER_EMAIL = "no-reply@kcrinici.com";
const RECIPIENT_EMAIL = "member@example.com";

const AdminEmailPreview = () => {
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [templateType, setTemplateType] = useState("signup");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [originalUrl, setOriginalUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState<string>("");

  // Load current WhatsApp URL from site_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "whatsapp_group_url")
        .maybeSingle();
      const v = (data?.value as string) || "";
      setWhatsappUrl(v);
      setOriginalUrl(v);
    })();
  }, []);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("יש להתחבר מחדש");

      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: templateType,
          whatsappGroupUrl: whatsappUrl || undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      setHtml(await res.text());
    } catch (e: any) {
      toast({
        title: "טעינת התצוגה נכשלה",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [templateType, whatsappUrl, toast]);

  // Auto-refresh on template change
  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateType]);

  const handleSaveWhatsapp = async () => {
    if (!whatsappUrl.trim()) {
      toast({ title: "יש להזין קישור", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "whatsapp_group_url", value: whatsappUrl.trim() }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "שמירה נכשלה", description: error.message, variant: "destructive" });
      return;
    }
    setOriginalUrl(whatsappUrl.trim());
    toast({ title: "נשמר", description: "הקישור יופיע בכל המיילים החדשים." });
    loadPreview();
  };

  const deviceWidth = useMemo(() => (device === "mobile" ? 390 : 760), [device]);
  const dirty = whatsappUrl.trim() !== originalUrl.trim();
  const current = TEMPLATES.find((t) => t.id === templateType)!;
  const now = useMemo(
    () => new Date().toLocaleString("he-IL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    [templateType]
  );
  const initials = SENDER_NAME.trim().charAt(0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* WhatsApp URL editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="h-5 w-5 text-green-600" />
            קישור לקבוצת הוואטסאפ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            הקישור הזה מופיע בכל מיילי המערכת (הרשמה, איפוס סיסמה, הזמנות ועוד), עדכון כאן משפיע על כל התבניות באופן אוטומטי.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              dir="ltr"
              placeholder="https://chat.whatsapp.com/..."
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveWhatsapp} disabled={saving || !dirty} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">תצוגה מקדימה של מיילים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">סוג מייל</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant={device === "desktop" ? "default" : "outline"}
                size="sm"
                onClick={() => setDevice("desktop")}
                className="flex-1 gap-1.5"
              >
                <Monitor className="h-4 w-4" /> דסקטופ
              </Button>
              <Button
                variant={device === "mobile" ? "default" : "outline"}
                size="sm"
                onClick={() => setDevice("mobile")}
                className="flex-1 gap-1.5"
              >
                <Smartphone className="h-4 w-4" /> מובייל
              </Button>
              <Button variant="ghost" size="sm" onClick={loadPreview} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Email-client style preview */}
          <div className="rounded-xl border bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-8 overflow-auto">
            <div
              className="mx-auto bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-300 ring-1 ring-black/5"
              style={{ width: `${deviceWidth}px`, maxWidth: "100%" }}
              dir="ltr"
            >
              {/* Mail client toolbar */}
              <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-slate-50 text-slate-600">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Inbox className="h-3.5 w-3.5" />
                  <span>Inbox</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Reply className="h-4 w-4" />
                  <Forward className="h-4 w-4" />
                  <Star className="h-4 w-4" />
                  <MoreVertical className="h-4 w-4" />
                </div>
              </div>

              {/* Subject header */}
              <div className="px-5 pt-5 pb-3 border-b" dir="rtl">
                <h2 className="text-[17px] sm:text-xl font-semibold text-slate-900 leading-snug">
                  {current.subject}
                </h2>
                <div className="mt-3 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-white grid place-items-center text-sm font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900 truncate">
                        {SENDER_NAME}
                        <span className="ms-2 text-slate-400 font-normal" dir="ltr">&lt;{SENDER_EMAIL}&gt;</span>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0">{now}</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5" dir="rtl">
                      אל: <span dir="ltr">{RECIPIENT_EMAIL}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email body */}
              {loading && !html ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  title="Email preview"
                  srcDoc={html}
                  className="w-full block"
                  style={{ height: device === "mobile" ? "720px" : "880px", border: 0, background: "white" }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            כך ייראה המייל אצל הנמען, כולל שורת נושא, שולח ותצוגת לקוח הדואר. הקישור לוואטסאפ נטען מההגדרות בזמן אמת.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailPreview;
