import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "@/lib/file-validation";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Star, Loader2 } from "lucide-react";

export const MAX_LISTING_IMAGES = 5;

interface Props {
  userId: string | null;
  images: string[];
  onChange: (urls: string[]) => void;
}

/**
 * Up to five photos per listing: the first one is the main image and the rest
 * feed the swipeable gallery. Any photo can be promoted to main.
 * Guests upload into a dedicated "guest" folder, which the storage policy allows.
 */
const ListingImageManager = ({ userId, images, onChange }: Props) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_LISTING_IMAGES - images.length;

  const uploadFile = async (file: File): Promise<string | null> => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error!.title, description: validation.error!.description, variant: "destructive" });
      return null;
    }
    const ext = file.name.split(".").pop();
    const folder = userId || "guest";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("announcements").upload(path, file);
    if (error) {
      toast({ title: "שגיאה בהעלאה", description: error.message, variant: "destructive" });
      return null;
    }
    return supabase.storage.from("announcements").getPublicUrl(path).data.publicUrl;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    if (files.length > remaining) {
      toast({
        title: `אפשר להעלות עד ${MAX_LISTING_IMAGES} תמונות`,
        description: `נשארו ${remaining} מקומות פנויים, נעלה את הראשונות.`,
      });
    }

    setUploading(true);
    const added: string[] = [];
    for (const file of files.slice(0, remaining)) {
      const url = await uploadFile(file);
      if (url) added.push(url);
    }
    if (added.length) onChange([...images, ...added]);
    setUploading(false);
  };

  const removeAt = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  const makeMain = (i: number) => {
    const next = [...images];
    const [picked] = next.splice(i, 1);
    onChange([picked, ...next]);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <div className="grid grid-cols-5 gap-1.5">
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className={`group relative aspect-square overflow-hidden rounded-lg border ${i === 0 ? "border-gold" : "border-border"}`}
          >
            <img src={url} alt={i === 0 ? "תמונה ראשית" : `תמונה ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute left-0.5 top-0.5 rounded-full bg-background/85 p-0.5 text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
              aria-label="הסרת תמונה"
            >
              <X className="h-3 w-3" />
            </button>
            {i === 0 ? (
              <span className="absolute inset-x-0 bottom-0 bg-gold/90 py-0.5 text-center font-body text-[8px] font-bold text-primary-foreground">
                ראשית
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeMain(i)}
                className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-background/85 py-0.5 font-body text-[8px] text-muted-foreground transition-colors hover:bg-gold hover:text-primary-foreground"
                title="הפוך לתמונה הראשית"
              >
                <Star className="h-2.5 w-2.5" />
                ראשית
              </button>
            )}
          </div>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-border bg-background/50 transition-colors hover:border-gold/60 disabled:opacity-60"
            aria-label="הוספת תמונות"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gold" />
            ) : (
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-[10px] leading-snug text-muted-foreground/80">
          {images.length}/{MAX_LISTING_IMAGES} תמונות. הראשונה היא הראשית, ואפשר להחליף בלחיצה על ראשית.
        </p>
        {remaining > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-8 shrink-0 font-body text-xs"
          >
            <ImagePlus className="ml-1 h-3.5 w-3.5" />
            {uploading ? "מעלה..." : "בחירת תמונות"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ListingImageManager;
