import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Image, ArrowRight, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import PageHero from "@/components/PageHero";
import ClubAboutSection from "@/components/ClubAboutSection";
import heroImg from "@/assets/hero-gallery.jpg";

type Album = Tables<"gallery_albums">;
type Photo = Tables<"gallery_photos">;

const Gallery = () => {
  const { toast } = useToast();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create album dialog
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Album detail view
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
      }
      await fetchAlbums();
      setLoading(false);
    };
    init();
  }, []);

  const fetchAlbums = async () => {
    const { data } = await supabase
      .from("gallery_albums")
      .select("*")
      .order("created_at", { ascending: false });
    setAlbums(data || []);
  };

  const handleCreateAlbum = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("gallery_albums").insert({
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        created_by: userId,
      });
      if (error) throw error;
      toast({ title: "אלבום נוצר בהצלחה!" });
      setNewTitle("");
      setNewDesc("");
      setShowCreate(false);
      await fetchAlbums();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const openAlbum = async (album: Album) => {
    setSelectedAlbum(album);
    setLoadingPhotos(true);
    const { data } = await supabase
      .from("gallery_photos")
      .select("*")
      .eq("album_id", album.id)
      .order("created_at", { ascending: false });
    setPhotos(data || []);
    setLoadingPhotos(false);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedAlbum || !userId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${selectedAlbum.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file);
        if (uploadErr) throw uploadErr;

        const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(path);
        const { error: insertErr } = await supabase.from("gallery_photos").insert({
          album_id: selectedAlbum.id,
          image_url: publicUrl,
          uploaded_by: userId,
        });
        if (insertErr) throw insertErr;
      }
      toast({ title: "התמונות הועלו בהצלחה!" });
      // Update cover if album has none
      if (!selectedAlbum.cover_image_url) {
        const firstUrl = supabase.storage.from("gallery").getPublicUrl(`${userId}/${selectedAlbum.id}`);
        // Refresh photos
      }
      await openAlbum(selectedAlbum);
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (photo: Photo) => {
    try {
      const { error } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
      if (error) throw error;
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast({ title: "התמונה נמחקה" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      const { error } = await supabase.from("gallery_albums").delete().eq("id", albumId);
      if (error) throw error;
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
      toast({ title: "האלבום נמחק" });
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">טוען...</p>
      </div>
    );
  }

  // Lightbox view
  if (lightboxIndex !== null) {
    const photo = photos[lightboxIndex];
    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
        <button className="absolute top-4 right-4 text-foreground" onClick={() => setLightboxIndex(null)}>
          <X className="h-6 w-6" />
        </button>
        {lightboxIndex > 0 && (
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground p-2" onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}>
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
        {lightboxIndex < photos.length - 1 && (
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground p-2" onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}>
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        <img
          src={photo?.image_url}
          alt={photo?.caption || ""}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  // Album detail view
  if (selectedAlbum) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <button onClick={() => setSelectedAlbum(null)} className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowRight className="h-4 w-4" />
          חזרה לגלריה
        </button>

        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
            {selectedAlbum.title}
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gradient-gold text-primary-foreground font-body gap-1">
              <Plus className="h-4 w-4" />
              {uploading ? "מעלה..." : "העלאת תמונות"}
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadPhoto} />
          </div>
        </div>

        {selectedAlbum.description && (
          <p className="font-body text-muted-foreground mb-6">{selectedAlbum.description}</p>
        )}

        {loadingPhotos ? (
          <p className="font-body text-muted-foreground text-center py-12">טוען תמונות...</p>
        ) : photos.length === 0 ? (
          <div className="text-center py-16">
            <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-body text-muted-foreground">עדיין אין תמונות באלבום הזה</p>
            <Button onClick={() => fileInputRef.current?.click()} className="mt-4 gradient-gold text-primary-foreground font-body">
              העלה תמונה ראשונה
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((photo, idx) => (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-card border border-border cursor-pointer" onClick={() => setLightboxIndex(idx)}>
                <img src={photo.image_url} alt={photo.caption || ""} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                {(photo.uploaded_by === userId || isAdmin) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                    className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 text-destructive-foreground rounded-full p-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Albums list
  return (
    <>
    <PageHero image={heroImg} title="גלריית" highlight="תמונות" subtitle="רגעים מיוחדים מאירועי ומפגשי המועדון" />
    <ClubAboutSection />
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-2">
        <Link to="/dashboard" className="inline-flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
          גלריית <span className="text-gold">תמונות</span>
        </h1>
        <Button onClick={() => setShowCreate(true)} className="gradient-gold text-primary-foreground font-body gap-1">
          <Plus className="h-4 w-4" />
          אלבום חדש
        </Button>
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-16">
          <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="font-body text-lg text-muted-foreground">עדיין אין אלבומים</p>
          <p className="font-body text-sm text-muted-foreground mt-1">צרו אלבום חדש ושתפו תמונות מהמועדון</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => (
            <div
              key={album.id}
              onClick={() => openAlbum(album)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card cursor-pointer transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5"
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                {album.cover_image_url ? (
                  <img src={album.cover_image_url} alt={album.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <Image className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-serif text-lg font-bold text-foreground">{album.title}</h3>
                {album.description && (
                  <p className="font-body text-sm text-muted-foreground mt-1 line-clamp-2">{album.description}</p>
                )}
                <p className="font-body text-xs text-muted-foreground mt-2">
                  {new Date(album.created_at).toLocaleDateString("he-IL")}
                </p>
              </div>
              {(album.created_by === userId || isAdmin) && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 text-destructive-foreground rounded-full p-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">אלבום חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">שם האלבום <span className="text-gold">*</span></label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-card border-border" placeholder="למשל: מפגש ינואר 2026" />
            </div>
            <div>
              <label className="mb-1.5 block font-body text-sm text-muted-foreground">תיאור</label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-card border-border" placeholder="תיאור קצר של האלבום..." />
            </div>
            <Button onClick={handleCreateAlbum} disabled={creating || !newTitle.trim()} className="w-full gradient-gold text-primary-foreground font-body py-5">
              {creating ? "יוצר..." : "צור אלבום"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default Gallery;
