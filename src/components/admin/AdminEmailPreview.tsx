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
import { Loader2, Smartphone, Monitor, RefreshCw, Save, MessageCircle } from "lucide-react";

const TEMPLATES = [
  { id: "signup", label: "אישור הרשמה" },
  { id: "magiclink", label: "קישור כניסה (Magic Link)" },
  { id: "recovery", label: "איפוס סיסמה" },
  { id: "invite", label: "הזמנה להצטרף" },
  { id: "email_change", label: "החלפת כתובת אימייל" },
  { id: "reauthentication", label: "קוד אימות (OTP)" },
];

const FUNCTIONS_URL = `${(import.meta as any).env.VITE_SUPABASE_URL || ""}/functions/v1/admin-preview-email`;

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

  const deviceWidth = useMemo(() => (device === "mobile" ? 390 : 720), [device]);
  const dirty = whatsappUrl.trim() !== originalUrl.trim();

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
            הקישור הזה מופיע בכל מיילי המערכת (הרשמה, איפוס סיסמה, הזמנות ועוד) — עדכון כאן משפיע על כל התבניות באופן אוטומטי.
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

          {/* Preview frame */}
          <div className="rounded-xl border bg-muted/30 p-4 sm:p-6 overflow-auto">
            <div
              className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300"
              style={{ width: `${deviceWidth}px`, maxWidth: "100%" }}
            >
              {loading && !html ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  title="Email preview"
                  srcDoc={html}
                  className="w-full"
                  style={{ height: "780px", border: 0, background: "white" }}
                />
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            התצוגה מקדימה משתמשת בנתוני דמה. הקישור לוואטסאפ נטען מההגדרות בזמן אמת.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmailPreview;
