import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Eye, Smartphone, Monitor } from "lucide-react";
import {
  EMAIL_COPY_DEFAULTS,
  EMAIL_COPY_KEY,
  EMAIL_TEMPLATE_LABELS,
  type EmailCopy,
  type EmailTemplateId,
} from "@/lib/emailDefaults";

const FUNCTIONS_URL = `${(import.meta as any).env.VITE_SUPABASE_URL || ""}/functions/v1/admin-preview-email`;

const TEMPLATE_IDS: EmailTemplateId[] = [
  "signup", "magiclink", "recovery", "invite", "email_change", "reauthentication",
];

const AdminEmailContent = () => {
  const { toast } = useToast();
  const [templateId, setTemplateId] = useState<EmailTemplateId>("signup");
  const [copy, setCopy] = useState<EmailCopy>(EMAIL_COPY_DEFAULTS.signup);
  const [savedCopy, setSavedCopy] = useState<EmailCopy>(EMAIL_COPY_DEFAULTS.signup);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const defaults = EMAIL_COPY_DEFAULTS[templateId];

  // Load saved overrides for selected template
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", EMAIL_COPY_KEY(templateId))
        .maybeSingle();
      if (cancelled) return;
      let next = { ...EMAIL_COPY_DEFAULTS[templateId] };
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          next = { ...next, ...parsed };
        } catch (_e) { /* ignore */ }
      }
      setCopy(next);
      setSavedCopy(next);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [templateId]);

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("יש להתחבר מחדש");
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: templateId, copy }),
      });
      if (!res.ok) throw new Error(await res.text());
      setHtml(await res.text());
    } catch (e: any) {
      toast({ title: "טעינת התצוגה נכשלה", description: e.message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  }, [templateId, copy, toast]);

  // Auto-preview on template change (uses last loaded copy)
  useEffect(() => { loadPreview(); /* eslint-disable-next-line */ }, [templateId]);

  const dirty = useMemo(
    () => (Object.keys(copy) as (keyof EmailCopy)[]).some((k) => (copy[k] || "") !== (savedCopy[k] || "")),
    [copy, savedCopy]
  );

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: EMAIL_COPY_KEY(templateId), value: JSON.stringify(copy) }, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "שמירה נכשלה", description: error.message, variant: "destructive" });
      return;
    }
    setSavedCopy(copy);
    toast({ title: "נשמר", description: "המלל יופיע במיילים הבאים שיישלחו." });
    loadPreview();
  };

  const handleResetToDefaults = () => {
    setCopy({ ...defaults });
  };

  const handleRevert = () => setCopy({ ...savedCopy });

  const update = (k: keyof EmailCopy, v: string) => setCopy((p) => ({ ...p, [k]: v }));

  const deviceWidth = device === "mobile" ? 390 : 720;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">עריכת מלל למיילי המערכת</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            עריכת הטקסטים שמופיעים במיילים האוטומטיים שהמערכת שולחת (הרשמה, איפוס סיסמה, הזמנה ועוד).
            שדות שיישארו ריקים יחזרו לטקסט ברירת המחדל.
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs">סוג מייל</Label>
            <Select value={templateId} onValueChange={(v) => setTemplateId(v as EmailTemplateId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATE_IDS.map((id) => (
                  <SelectItem key={id} value={id}>{EMAIL_TEMPLATE_LABELS[id]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label="שורת נושא (Subject)" placeholder={defaults.subject}
                value={copy.subject} onChange={(v) => update("subject", v)} />
              <Field label="טקסט תצוגה מקדימה (Preview)" placeholder={defaults.preview}
                value={copy.preview} onChange={(v) => update("preview", v)} />
              <Field label="כותרת ראשית" placeholder={defaults.heading}
                value={copy.heading} onChange={(v) => update("heading", v)} />
              <Field label="תווית כפתור (CTA)" placeholder={defaults.ctaLabel || "—"}
                value={copy.ctaLabel} onChange={(v) => update("ctaLabel", v)}
                disabled={templateId === "reauthentication"} />
              <Field label="פסקת פתיחה" placeholder={defaults.intro} multiline
                value={copy.intro} onChange={(v) => update("intro", v)} className="lg:col-span-2" />
              <Field label="פסקת סיום" placeholder={defaults.outro} multiline
                value={copy.outro} onChange={(v) => update("outro", v)} className="lg:col-span-2" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            <Button onClick={handleSave} disabled={!dirty || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              שמור שינויים
            </Button>
            <Button variant="outline" onClick={handleRevert} disabled={!dirty || saving}>
              בטל שינויים
            </Button>
            <Button variant="ghost" onClick={handleResetToDefaults} disabled={saving} className="gap-2">
              <RotateCcw className="h-4 w-4" /> אפס לברירת מחדל
            </Button>
            <div className="mr-auto" />
            <Button variant="secondary" onClick={loadPreview} disabled={previewLoading} className="gap-2">
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              רענן תצוגה מקדימה
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">תצוגה מקדימה חיה</CardTitle>
          <div className="flex gap-2">
            <Button variant={device === "desktop" ? "default" : "outline"} size="sm"
              onClick={() => setDevice("desktop")} className="gap-1.5">
              <Monitor className="h-4 w-4" /> דסקטופ
            </Button>
            <Button variant={device === "mobile" ? "default" : "outline"} size="sm"
              onClick={() => setDevice("mobile")} className="gap-1.5">
              <Smartphone className="h-4 w-4" /> מובייל
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-6 overflow-auto">
            <div
              className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden ring-1 ring-black/5"
              style={{ width: `${deviceWidth}px`, maxWidth: "100%" }}
              dir="ltr"
            >
              {previewLoading && !html ? (
                <div className="flex items-center justify-center h-96">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <iframe ref={iframeRef} title="Email preview" srcDoc={html}
                  className="w-full block"
                  style={{ height: device === "mobile" ? "720px" : "880px", border: 0, background: "white" }}
                />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            התצוגה משקפת את השינויים שלא נשמרו עדיין — לחיצה על "שמור" תפעיל אותם על המיילים האמיתיים.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  disabled?: boolean;
  className?: string;
}
const Field = ({ label, value, placeholder, onChange, multiline, disabled, className }: FieldProps) => (
  <div className={`space-y-1.5 ${className || ""}`}>
    <Label className="text-xs">{label}</Label>
    {multiline ? (
      <Textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    ) : (
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    )}
  </div>
);

export default AdminEmailContent;
