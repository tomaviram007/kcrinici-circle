import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSiteLogo } from "@/hooks/useSiteLogo";
import { Button } from "@/components/ui/button";
import { ImageIcon, Upload, Loader2 } from "lucide-react";

const AdminLogo = () => {
  const { toast } = useToast();
  const currentLogo = useSiteLogo();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("site_settings")
        .update({ value: publicUrl, updated_at: new Date().toISOString() })
        .eq("key", "logo_url");

      if (updateError) throw updateError;

      setPreview(publicUrl);
      toast({ title: "הלוגו עודכן בהצלחה!", description: "רענן את הדף כדי לראות את השינוי בהדר." });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-gold" /> ניהול לוגו האתר
      </h3>

      <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center gap-6">
        <p className="font-body text-sm text-muted-foreground">לוגו נוכחי:</p>
        <div className="h-32 w-32 rounded-xl border-2 border-gold/20 bg-background flex items-center justify-center overflow-hidden">
          <img
            src={preview || currentLogo}
            alt="לוגו האתר"
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />

        <Button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="gradient-gold text-primary-foreground font-body"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 ml-1 animate-spin" /> מעלה...</>
          ) : (
            <><Upload className="h-4 w-4 ml-1" /> העלה לוגו חדש</>
          )}
        </Button>

        <p className="font-body text-xs text-muted-foreground">PNG, JPG או SVG — עד 5MB</p>
      </div>
    </div>
  );
};

export default AdminLogo;
