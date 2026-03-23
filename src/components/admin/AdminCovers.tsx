import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Image, Trash2 } from "lucide-react";
import { validateImageFile } from "@/lib/file-validation";

const PAGE_DEFINITIONS = [
  { key: "dashboard", label: "דף הבית (דשבורד)" },
  { key: "events", label: "אירועים ומפגשים" },
  { key: "members", label: "אינדקס החברים" },
  { key: "announcements", label: "לוח מודעות" },
  { key: "jobs", label: "הזדמנויות בשכונה" },
  { key: "gallery", label: "גלריית תמונות" },
  { key: "recommendations", label: "אנשי מקצוע" },
  { key: "admin", label: "שולחן המנהל" },
];

const AdminCovers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: covers = {} } = useQuery({
    queryKey: ["admin-covers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .like("key", "cover_image_%");
      const map: Record<string, string> = {};
      data?.forEach((row) => {
        const pageKey = row.key.replace("cover_image_", "");
        map[pageKey] = row.value;
      });
      return map;
    },
  });

  const handleUpload = async (pageKey: string, file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error?.title || "שגיאה", description: validation.error?.description || "שגיאה בהעלאה", variant: "destructive" });
      return;
    }

    setUploading(pageKey);
    try {
      const ext = file.name.split(".").pop();
      const path = `covers/${pageKey}-${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Upsert site_settings
      const settingKey = `cover_image_${pageKey}`;
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", settingKey)
        .maybeSingle();

      if (existing) {
        await supabase.from("site_settings").update({ value: publicUrl }).eq("key", settingKey);
      } else {
        await supabase.from("site_settings").insert({ key: settingKey, value: publicUrl });
      }

      toast({ title: "תמונת הקאבר עודכנה!" });
      queryClient.invalidateQueries({ queryKey: ["admin-covers"] });
      queryClient.invalidateQueries({ queryKey: ["page-cover", pageKey] });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (pageKey: string) => {
    const settingKey = `cover_image_${pageKey}`;
    await supabase.from("site_settings").delete().eq("key", settingKey);
    toast({ title: "תמונת הקאבר הוסרה — תוצג תמונת ברירת מחדל" });
    queryClient.invalidateQueries({ queryKey: ["admin-covers"] });
    queryClient.invalidateQueries({ queryKey: ["page-cover", pageKey] });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <Image className="h-5 w-5 text-primary" /> ניהול תמונות קאבר
      </h3>
      <p className="text-sm font-body text-muted-foreground">
        העלו תמונת קאבר מותאמת לכל עמוד. במידה ולא הוגדרה תמונה, תוצג תמונת ברירת מחדל.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PAGE_DEFINITIONS.map((page) => {
          const coverUrl = covers[page.key];
          const isUploading = uploading === page.key;

          return (
            <div key={page.key} className="rounded-xl border border-border bg-card overflow-hidden">
              {/* Preview */}
              <div className="relative h-32 bg-muted">
                {coverUrl ? (
                  <img src={coverUrl} alt={page.label} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground/40">
                    <Image className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <span className="absolute bottom-2 right-3 font-body text-sm font-bold text-foreground">
                  {page.label}
                </span>
              </div>

              {/* Actions */}
              <div className="p-3 flex items-center gap-2">
                <Label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(page.key, file);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full font-body gap-2"
                    disabled={isUploading}
                    asChild
                  >
                    <span>
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? "מעלה..." : coverUrl ? "החלף תמונה" : "העלה תמונה"}
                    </span>
                  </Button>
                </Label>
                {coverUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(page.key)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCovers;
