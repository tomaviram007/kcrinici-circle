import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, User } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-28 w-28",
};

const iconSizes = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const AvatarUpload = ({ userId, currentUrl, onUpload, size = "md" }: AvatarUploadProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "הקובץ גדול מדי", description: "גודל מקסימלי: 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: urlWithCache }).eq("user_id", userId);

      setPreview(urlWithCache);
      onUpload(urlWithCache);
      toast({ title: "התמונה עודכנה!" });
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`${sizes[size]} rounded-full border-2 border-gold/20 bg-secondary overflow-hidden flex items-center justify-center transition-all hover:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/30`}
      >
        {preview ? (
          <img src={preview} alt="תמונת פרופיל" className="h-full w-full object-cover" />
        ) : (
          <User className={`${iconSizes[size]} text-gold`} />
        )}
      </button>
      <div className="absolute -bottom-0.5 -left-0.5 rounded-full bg-card border border-border p-1">
        <Camera className="h-3 w-3 text-gold" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;
