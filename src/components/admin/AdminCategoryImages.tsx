import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Shapes } from "lucide-react";
import { validateImageFile } from "@/lib/file-validation";
import { SECONDHAND_CATEGORIES, CATEGORY_IMAGE_PREFIX, categoryImageKey } from "@/lib/secondhand-categories";
import CategoryImage from "@/components/listings/CategoryImage";

/**
 * A picture per second hand category, shown on items that have no photo.
 * Without an upload the board draws a tile with the category icon.
 */
const AdminCategoryImages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: images = {} } = useQuery({
    queryKey: ["admin-category-images"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .like("key", `${CATEGORY_IMAGE_PREFIX}%`);
      const map: Record<string, string> = {};
      data?.forEach((row) => {
        map[row.key.replace(CATEGORY_IMAGE_PREFIX, "")] = row.value;
      });
      return map;
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-category-images"] });
    queryClient.invalidateQueries({ queryKey: ["category-images", "secondhand"] });
  };

  const handleUpload = async (slug: string, file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: validation.error?.title || "שגיאה",
        description: validation.error?.description || "שגיאה בהעלאה",
        variant: "destructive",
      });
      return;
    }

    setUploading(slug);
    try {
      const ext = file.name.split(".").pop();
      const path = `categories/secondhand-${slug}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("site-assets").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from("site-assets").getPublicUrl(path).data.publicUrl;
      const settingKey = categoryImageKey(slug);
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", settingKey).maybeSingle();
      if (existing) {
        await supabase.from("site_settings").update({ value: publicUrl }).eq("key", settingKey);
      } else {
        await supabase.from("site_settings").insert({ key: settingKey, value: publicUrl });
      }

      toast({ title: "תמונת הקטגוריה עודכנה" });
      refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "שגיאה בהעלאה";
      toast({ title: "שגיאה", description: message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (slug: string) => {
    await supabase.from("site_settings").delete().eq("key", categoryImageKey(slug));
    toast({ title: "תמונת הקטגוריה הוסרה. יוצג האיור של הקטגוריה" });
    refresh();
  };

  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <Shapes className="h-5 w-5 text-primary" /> תמונות קטגוריה ליד שנייה
      </h3>
      <p className="text-sm font-body text-muted-foreground">
        פריט שפורסם בלי תמונה מקבל את התמונה של הקטגוריה שלו. בלי העלאה מוצג איור עם האייקון של הקטגוריה.
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {SECONDHAND_CATEGORIES.map((cat) => {
          const url = images[cat.slug];
          const isUploading = uploading === cat.slug;
          return (
            <div key={cat.slug} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted">
                <CategoryImage category={cat.name} src={url} alt={cat.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                <span className="absolute bottom-2 right-3 font-body text-sm font-bold text-foreground">{cat.name}</span>
              </div>
              <div className="p-3 flex items-center gap-2">
                <Label className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(cat.slug, file);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="outline" size="sm" className="w-full font-body gap-2" disabled={isUploading} asChild>
                    <span>
                      <Upload className="h-3.5 w-3.5" />
                      {isUploading ? "מעלה..." : url ? "החלף תמונה" : "העלה תמונה"}
                    </span>
                  </Button>
                </Label>
                {url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(cat.slug)}
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

export default AdminCategoryImages;
