import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteLogo } from "@/hooks/useSiteLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Upload, Loader2, Save } from "lucide-react";

const AdminLogo = () => {
  const { toast } = useToast();
  const current = useSiteLogo();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState(56);
  const [text, setText] = useState("");
  const [position, setPosition] = useState("center");
  const fileRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && current.logoUrl) {
      setSize(current.logoSize);
      setText(current.logoText);
      setPosition(current.logoPosition);
      setInitialized(true);
    }
  }, [current, initialized]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "שגיאה", description: "יש להעלות קובץ תמונה בלבד", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "שגיאה", description: "גודל הקובץ חייב להיות עד 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      await supabase.from("site_settings").update({ value: publicUrl }).eq("key", "logo_url");
      setPreview(publicUrl);
      toast({ title: "הלוגו הועלה בהצלחה!" });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("site_settings").update({ value: String(size) }).eq("key", "logo_size"),
        supabase.from("site_settings").update({ value: text }).eq("key", "logo_text"),
        supabase.from("site_settings").update({ value: position }).eq("key", "logo_position"),
      ]);
      toast({ title: "ההגדרות נשמרו!", description: "רענן את הדף כדי לראות את השינויים." });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const displayLogo = preview || current.logoUrl;

  return (
    <div className="space-y-6">
      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-gold" /> ניהול לוגו האתר
      </h3>

      {/* Preview */}
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="font-body text-sm text-muted-foreground mb-4 text-center">תצוגה מקדימה:</p>
        <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-background border border-border"
          style={{ justifyContent: position === "right" ? "flex-end" : position === "left" ? "flex-start" : "center" }}>
          <img
            src={displayLogo}
            alt="לוגו"
            className="rounded-full object-contain"
            style={{ height: `${size}px`, width: `${size}px` }}
          />
          {text && (
            <span className="font-serif text-lg font-bold text-foreground">{text}</span>
          )}
        </div>
      </div>

      {/* Upload */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <p className="font-body text-sm font-medium text-gold">החלפת תמונת לוגו</p>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg border border-gold/20 bg-background flex items-center justify-center overflow-hidden shrink-0">
            <img src={displayLogo} alt="לוגו" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex-1">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading} variant="outline" className="font-body">
              {uploading ? <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> מעלה...</> : <><Upload className="h-4 w-4 ml-1" /> העלה תמונה חדשה</>}
            </Button>
            <p className="font-body text-xs text-muted-foreground mt-1">PNG, JPG או SVG — עד 5MB</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-5">
        <p className="font-body text-sm font-medium text-gold">הגדרות תצוגה</p>

        {/* Size */}
        <div className="space-y-2">
          <Label className="font-body text-sm">גודל הלוגו: {size}px</Label>
          <Slider value={[size]} onValueChange={([v]) => setSize(v)} min={24} max={120} step={4} className="w-full" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <Label className="font-body text-sm">טקסט ליד הלוגו (אופציונלי)</Label>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="למשל: הגברים של ק.קרניצי" className="bg-background" autoComplete="off" />
        </div>

        {/* Position */}
        <div className="space-y-2">
          <Label className="font-body text-sm">מיקום בהדר</Label>
          <Select value={position} onValueChange={setPosition}>
            <SelectTrigger className="bg-background font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="center">מרכז</SelectItem>
              <SelectItem value="right">ימין</SelectItem>
              <SelectItem value="left">שמאל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleSaveSettings} disabled={saving} className="gradient-gold text-primary-foreground font-body w-full">
          {saving ? <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> שומר...</> : <><Save className="h-4 w-4 ml-1" /> שמור הגדרות</>}
        </Button>
      </div>
    </div>
  );
};

export default AdminLogo;
