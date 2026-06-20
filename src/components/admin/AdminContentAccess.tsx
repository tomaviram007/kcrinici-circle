import { useEffect, useState } from "react";
import { Shield, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const TYPES: { key: string; label: string }[] = [
  { key: "jobs", label: "לוח דרושים" },
  { key: "members", label: "חברי מועדון" },
  { key: "professionals", label: "אנשי מקצוע" },
  { key: "deals", label: "הטבות" },
  { key: "secondhand", label: "יד שנייה" },
  { key: "events", label: "אירועים" },
];

const FIELDS: { key: keyof Setting; label: string; help: string }[] = [
  { key: "public_list_enabled", label: "רשימה כללית פתוחה לכולם", help: "האם גולשים לא מחוברים יכולים לראות את הרשימה" },
  { key: "public_card_open_enabled", label: "פתיחת כרטיס מלא לכולם", help: "האם גולשים לא מחוברים יכולים לפתוח כרטיס/דיאלוג עם פרטים מלאים" },
  { key: "public_contact_enabled", label: "הצגת פרטי קשר לכולם", help: "טלפון, אימייל, וואטסאפ" },
  { key: "public_action_enabled", label: "פעולה (פנייה / מימוש) לכולם", help: "פתיחת וואטסאפ, מימוש הטבה, התקשרות" },
  { key: "public_images_enabled", label: "הצגת תמונות לכולם", help: "תמונות פריט / לוגו עסק" },
  { key: "public_price_enabled", label: "הצגת מחיר לכולם", help: "רלוונטי בעיקר ליד שנייה" },
];

interface Setting {
  content_type: string;
  public_list_enabled: boolean;
  public_card_open_enabled: boolean;
  public_contact_enabled: boolean;
  public_action_enabled: boolean;
  public_images_enabled: boolean;
  public_price_enabled: boolean;
}

const DEFAULTS: Omit<Setting, "content_type"> = {
  public_list_enabled: true,
  public_card_open_enabled: false,
  public_contact_enabled: false,
  public_action_enabled: false,
  public_images_enabled: true,
  public_price_enabled: true,
};

const AdminContentAccess = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<Record<string, Setting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("content_access_settings").select("*");
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      const map: Record<string, Setting> = {};
      TYPES.forEach((t) => {
        const found = (data || []).find((r: Setting) => r.content_type === t.key);
        map[t.key] = found || { content_type: t.key, ...DEFAULTS };
      });
      setRows(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const update = (type: string, field: keyof Setting, value: boolean) => {
    setRows((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
  };

  const resetDefaults = (type: string) => {
    setRows((prev) => ({ ...prev, [type]: { content_type: type, ...DEFAULTS } }));
  };

  const save = async () => {
    setSaving(true);
    const payload = Object.values(rows);
    const { error } = await (supabase as any).from("content_access_settings").upsert(payload, { onConflict: "content_type" });
    setSaving(false);
    if (error) {
      toast({ title: "שגיאה בשמירה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ההגדרות נשמרו" });
    }
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" />
            הרשאות תוכן
          </h3>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            הגדר עבור כל סוג תוכן מה גלוי לגולש לא מחובר. ברירת המחדל: רשימה כללית פתוחה לכולם, פרטים מלאים ויצירת קשר לחברי מועדון בלבד.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gradient-gold text-primary-foreground font-body">
          <Save className="h-4 w-4 ml-1" /> {saving ? "שומר..." : "שמור הגדרות"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {TYPES.map((t) => {
          const row = rows[t.key];
          if (!row) return null;
          return (
            <div key={t.key} className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-lg font-bold text-foreground">{t.label}</h4>
                <Button size="sm" variant="ghost" onClick={() => resetDefaults(t.key)} className="font-body text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3 ml-1" /> ברירת מחדל
                </Button>
              </div>
              <div className="space-y-3">
                {FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-sm text-foreground">{f.label}</p>
                      <p className="font-body text-xs text-muted-foreground">{f.help}</p>
                    </div>
                    <Switch
                      checked={!!row[f.key]}
                      onCheckedChange={(v) => update(t.key, f.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminContentAccess;
