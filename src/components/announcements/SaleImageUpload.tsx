import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateImageFile } from "@/lib/file-validation";

interface SaleImageUploadProps {
  userId: string;
  mainImage: string | null;
  galleryImages: string[];
  onMainImageChange: (url: string | null) => void;
  onGalleryChange: (urls: string[]) => void;
}

const SaleImageUpload = ({ userId, mainImage, galleryImages, onMainImageChange, onGalleryChange }: SaleImageUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error!.title, description: validation.error!.description, variant: "destructive" });
      return null;
    }
    const ext = file.name.split(".").pop();
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("announcements").upload(path, file);
    if (error) {
      toast({ title: "שגיאה בהעלאה", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("announcements").getPublicUrl(path);
    return publicUrl;
  }, [userId, toast]);

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) onMainImageChange(url);
    setUploading(false);
    e.target.value = "";
  };

  const handleGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }
    onGalleryChange([...galleryImages, ...newUrls]);
    setUploading(false);
    e.target.value = "";
  };

  const removeGalleryImage = (index: number) => {
    onGalleryChange(galleryImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div>
        <p className="font-body text-sm text-muted-foreground mb-1.5">תמונה ראשית</p>
        {mainImage ? (
          <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
            <img src={mainImage} alt="תמונה ראשית" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onMainImageChange(null)}
              className="absolute top-2 left-2 rounded-full bg-background/80 p-1 hover:bg-background transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed border-border hover:border-gold/50 cursor-pointer transition-colors bg-background/50">
            <ImageIcon className="h-8 w-8 text-muted-foreground mb-1" />
            <span className="font-body text-xs text-muted-foreground">
              {uploading ? "מעלה..." : "לחץ להעלאת תמונה ראשית"}
            </span>
            <input type="file" accept="image/*" onChange={handleMainImage} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Gallery */}
      <div>
        <p className="font-body text-sm text-muted-foreground mb-1.5">גלריית תמונות נוספות</p>
        <div className="grid grid-cols-3 gap-2">
          {galleryImages.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
              <img src={url} alt={`תמונה ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(i)}
                className="absolute top-1 left-1 rounded-full bg-background/80 p-0.5 hover:bg-background transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {galleryImages.length < 6 && (
            <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-border hover:border-gold/50 cursor-pointer transition-colors bg-background/50">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="font-body text-[10px] text-muted-foreground mt-0.5">
                {uploading ? "..." : "הוסף"}
              </span>
              <input type="file" accept="image/*" multiple onChange={handleGalleryImages} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleImageUpload;
