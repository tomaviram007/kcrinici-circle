import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Image, ArrowRight, Trash2, X, ChevronLeft, ChevronRight, Pencil, Link2, Upload, Star, Calendar, User, Filter, AlertTriangle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import PageHero from "@/components/PageHero";

import QuoteSection from "@/components/landing/QuoteSection";
import SmartAdBanner from "@/components/ads/SmartAdBanner";
import heroImg from "@/assets/hero-gallery.jpg";
import { usePageCover } from "@/hooks/usePageCover";
import { validateImageFile } from "@/lib/file-validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Album = Tables<"gallery_albums">;
type Photo = Tables<"gallery_photos">;

const Gallery = () => {
  const { toast } = useToast();
  const coverImage = usePageCover("gallery", heroImg);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumCreators, setAlbumCreators] = useState<Record<string, any>>({});
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
  const [albumCreator, setAlbumCreator] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Album info dialog
  const [showAlbumInfo, setShowAlbumInfo] = useState(false);

  // Edit album dialog
  const [showEditAlbum, setShowEditAlbum] = useState(false);
  const [editAlbumTitle, setEditAlbumTitle] = useState("");
  const [editAlbumDesc, setEditAlbumDesc] = useState("");
  const [savingAlbum, setSavingAlbum] = useState(false);

  // Photo edit dialog
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoLinkUrl, setPhotoLinkUrl] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const photoFileRef = useRef<HTMLInputElement>(null);

  // Add photo by link dialog
  const [showAddByLink, setShowAddByLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

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

    // Fetch creators for all albums
    const creatorIds = [...new Set((data || []).map(a => a.created_by).filter(Boolean))];
    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, profession, avatar_url")
        .in("user_id", creatorIds);
      const map: Record<string, any> = {};
      profiles?.forEach(p => { map[p.user_id] = p; });
      setAlbumCreators(map);
    }
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
    setAlbumCreator(null);

    const [{ data: photosData }, creatorResult] = await Promise.all([
      supabase.from("gallery_photos").select("*").eq("album_id", album.id).order("created_at", { ascending: false }),
      album.created_by
        ? supabase.from("profiles").select("full_name, profession, avatar_url").eq("user_id", album.created_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setPhotos(photosData || []);
    setAlbumCreator(creatorResult?.data || null);
    setLoadingPhotos(false);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !selectedAlbum || !userId) return;

    for (const file of Array.from(files)) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast({ ...validation.error!, variant: "destructive" });
        return;
      }
    }

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
      await openAlbum(selectedAlbum);
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddPhotoByLink = async () => {
    if (!linkUrl.trim() || !selectedAlbum || !userId) return;
    setAddingLink(true);
    try {
      const { error } = await supabase.from("gallery_photos").insert({
        album_id: selectedAlbum.id,
        image_url: linkUrl.trim(),
        uploaded_by: userId,
      });
      if (error) throw error;
      toast({ title: "התמונה נוספה!" });
      setLinkUrl("");
      setShowAddByLink(false);
      await openAlbum(selectedAlbum);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setAddingLink(false);
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

  const handleSetCover = async (photoUrl: string) => {
    if (!selectedAlbum) return;
    try {
      const { error } = await supabase.from("gallery_albums").update({ cover_image_url: photoUrl }).eq("id", selectedAlbum.id);
      if (error) throw error;
      setSelectedAlbum({ ...selectedAlbum, cover_image_url: photoUrl });
      toast({ title: "תמונה ראשית עודכנה!" });
      await fetchAlbums();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    }
  };

  const openEditPhoto = (photo: Photo) => {
    setEditingPhoto(photo);
    setPhotoCaption(photo.caption || "");
    setPhotoLinkUrl("");
  };

  const handleSavePhotoEdit = async () => {
    if (!editingPhoto) return;
    setSavingPhoto(true);
    try {
      const updates: any = { caption: photoCaption.trim() || null };
      if (photoLinkUrl.trim()) {
        updates.image_url = photoLinkUrl.trim();
      }
      const { error } = await supabase.from("gallery_photos").update(updates).eq("id", editingPhoto.id);
      if (error) throw error;
      toast({ title: "התמונה עודכנה!" });
      setEditingPhoto(null);
      if (selectedAlbum) await openAlbum(selectedAlbum);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleReplacePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPhoto || !userId) return;
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ ...validation.error!, variant: "destructive" });
      return;
    }
    setSavingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${selectedAlbum?.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(path);
      const { error } = await supabase.from("gallery_photos").update({ image_url: publicUrl }).eq("id", editingPhoto.id);
      if (error) throw error;
      toast({ title: "התמונה הוחלפה!" });
      setEditingPhoto(null);
      if (selectedAlbum) await openAlbum(selectedAlbum);
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSavingPhoto(false);
      if (photoFileRef.current) photoFileRef.current.value = "";
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

  const canManagePhoto = (photo: Photo) => photo.uploaded_by === userId || isAdmin;
  const canManageAlbum = (album: Album) => album.created_by === userId || isAdmin;

  const handleSaveAlbumEdit = async () => {
    if (!selectedAlbum || !editAlbumTitle.trim()) return;
    setSavingAlbum(true);
    try {
      const updates: any = {
        title: editAlbumTitle.trim(),
        description: editAlbumDesc.trim() || null,
      };
      // Non-admin edits require re-approval
      if (!isAdmin) {
        updates.is_approved = false;
      }
      const { error } = await supabase.from("gallery_albums").update(updates).eq("id", selectedAlbum.id);
      if (error) throw error;
      setSelectedAlbum({ ...selectedAlbum, title: editAlbumTitle.trim(), description: editAlbumDesc.trim() || null });
      if (!isAdmin) {
        toast({ title: "השינויים נשלחו לאישור", description: "האלבום יוצג מחדש לאחר אישור מנהל המערכת." });
      } else {
        toast({ title: "פרטי האלבום עודכנו!" });
      }
      setShowEditAlbum(false);
      await fetchAlbums();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setSavingAlbum(false);
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
        {photo?.caption && (
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-body text-sm text-foreground bg-background/70 backdrop-blur-sm px-4 py-2 rounded-lg">{photo.caption}</p>
        )}
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

        {/* Album header with info */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
                  {selectedAlbum.title}
                </h1>
                {canManageAlbum(selectedAlbum) && (
                  <button
                    onClick={() => {
                      setEditAlbumTitle(selectedAlbum.title);
                      setEditAlbumDesc(selectedAlbum.description || "");
                      setShowEditAlbum(true);
                    }}
                    className="text-muted-foreground hover:text-gold transition-colors"
                    title="עריכת פרטי אלבום"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </div>
              {selectedAlbum.description && (
                <p className="font-body text-sm text-muted-foreground mb-3">{selectedAlbum.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-xs font-body text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gold" />
                  {new Date(selectedAlbum.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1">
                  <Image className="h-3.5 w-3.5 text-gold" />
                  {photos.length} תמונות
                </span>
              </div>
              {/* Creator */}
              {albumCreator && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="h-8 w-8 rounded-full bg-secondary border border-gold/20 flex items-center justify-center shrink-0 overflow-hidden">
                    {albumCreator.avatar_url ? (
                      <img src={albumCreator.avatar_url} alt={albumCreator.full_name} className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <User className="h-4 w-4 text-gold" />
                    )}
                  </div>
                  <div>
                    <span className="font-body text-sm text-foreground">{albumCreator.full_name}</span>
                    {albumCreator.profession && (
                      <span className="font-body text-xs text-gold mr-2"> • {albumCreator.profession}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Cover image preview with change button */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden bg-secondary border border-border shrink-0 group/cover">
              {selectedAlbum.cover_image_url ? (
                <img src={selectedAlbum.cover_image_url} alt="cover" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {canManageAlbum(selectedAlbum) && (
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover/cover:opacity-100 transition-opacity"
                >
                  {uploadingCover ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                  ) : (
                    <Pencil className="h-5 w-5 text-gold" />
                  )}
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !selectedAlbum || !userId) return;
                  const validation = validateImageFile(file);
                  if (!validation.valid) {
                    toast({ ...validation.error!, variant: "destructive" });
                    return;
                  }
                  setUploadingCover(true);
                  try {
                    const ext = file.name.split(".").pop();
                    const path = `${userId}/${selectedAlbum.id}/cover.${ext}`;
                    const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file, { upsert: true });
                    if (uploadErr) throw uploadErr;
                    const { data: { publicUrl } } = supabase.storage.from("gallery").getPublicUrl(path);
                    const coverUrl = `${publicUrl}?t=${Date.now()}`;
                    const { error } = await supabase.from("gallery_albums").update({ cover_image_url: coverUrl }).eq("id", selectedAlbum.id);
                    if (error) throw error;
                    setSelectedAlbum({ ...selectedAlbum, cover_image_url: coverUrl });
                    toast({ title: "תמונת קאבר עודכנה!" });
                    await fetchAlbums();
                  } catch (err: any) {
                    toast({ title: "שגיאה", description: err.message, variant: "destructive" });
                  } finally {
                    setUploadingCover(false);
                    if (coverInputRef.current) coverInputRef.current.value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} size="sm" className="gradient-gold text-primary-foreground font-body gap-1">
              <Upload className="h-3.5 w-3.5" />
              {uploading ? "מעלה..." : "העלאת תמונות"}
            </Button>
            <Button onClick={() => setShowAddByLink(true)} size="sm" variant="outline" className="font-body gap-1 border-gold/40 text-gold hover:bg-gold/10">
              <Link2 className="h-3.5 w-3.5" />
              הוסף מלינק
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadPhoto} />
          </div>
        </div>

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
                {photo.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/80 to-transparent p-2 pt-6">
                    <p className="font-body text-xs text-foreground truncate">{photo.caption}</p>
                  </div>
                )}
                {/* Cover indicator */}
                {selectedAlbum.cover_image_url === photo.image_url && (
                  <div className="absolute top-2 right-2 bg-gold/90 text-primary-foreground rounded-full p-1">
                    <Star className="h-3 w-3" />
                  </div>
                )}
                {/* Action buttons */}
                {canManagePhoto(photo) && (
                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditPhoto(photo); }}
                      className="bg-background/80 backdrop-blur-sm text-foreground rounded-full p-1.5 hover:bg-background transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSetCover(photo.image_url); }}
                      className="bg-background/80 backdrop-blur-sm text-gold rounded-full p-1.5 hover:bg-background transition-colors"
                      title="הגדר כתמונה ראשית"
                    >
                      <Star className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }}
                      className="bg-destructive/80 text-destructive-foreground rounded-full p-1.5 hover:bg-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add photo by link dialog */}
        <Dialog open={showAddByLink} onOpenChange={setShowAddByLink}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">הוספת תמונה <span className="text-gold">מלינק</span></DialogTitle>
              <DialogDescription className="sr-only">הוסף תמונה חדשה מקישור</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="font-body text-sm">קישור לתמונה</Label>
                <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com/image.jpg" dir="ltr" autoComplete="off" />
              </div>
              {linkUrl && (
                <div className="rounded-lg overflow-hidden bg-secondary border border-border aspect-video">
                  <img src={linkUrl} alt="preview" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
              <Button onClick={handleAddPhotoByLink} disabled={addingLink || !linkUrl.trim()} className="w-full gradient-gold text-primary-foreground font-body">
                {addingLink ? "מוסיף..." : "הוסף תמונה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit photo dialog */}
        <Dialog open={!!editingPhoto} onOpenChange={(open) => !open && setEditingPhoto(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">עריכת <span className="text-gold">תמונה</span></DialogTitle>
              <DialogDescription className="sr-only">עריכת פרטי התמונה</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {editingPhoto && (
                <div className="rounded-lg overflow-hidden bg-secondary border border-border aspect-video">
                  <img src={editingPhoto.image_url} alt="" className="h-full w-full object-contain" />
                </div>
              )}
              <div>
                <Label className="font-body text-sm">כיתוב</Label>
                <Input value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} placeholder="תיאור קצר..." autoComplete="off" />
              </div>
              <div>
                <Label className="font-body text-sm">החלף מלינק (אופציונלי)</Label>
                <Input value={photoLinkUrl} onChange={(e) => setPhotoLinkUrl(e.target.value)} placeholder="https://..." dir="ltr" autoComplete="off" />
              </div>
              <div>
                <Label className="font-body text-sm">או העלה קובץ חדש</Label>
                <input ref={photoFileRef} type="file" accept="image/*" className="block w-full font-body text-sm text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-foreground mt-1" onChange={handleReplacePhotoFile} />
              </div>
              <Button onClick={handleSavePhotoEdit} disabled={savingPhoto} className="w-full gradient-gold text-primary-foreground font-body">
                {savingPhoto ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit album dialog */}
        <Dialog open={showEditAlbum} onOpenChange={setShowEditAlbum}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">עריכת <span className="text-gold">אלבום</span></DialogTitle>
              <DialogDescription className="sr-only">עריכת שם ותיאור האלבום</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="font-body text-sm">שם האלבום <span className="text-gold">*</span></Label>
                <Input value={editAlbumTitle} onChange={(e) => setEditAlbumTitle(e.target.value)} className="bg-card border-border" autoComplete="off" />
              </div>
              <div>
                <Label className="font-body text-sm">תיאור</Label>
                <Textarea value={editAlbumDesc} onChange={(e) => setEditAlbumDesc(e.target.value)} className="bg-card border-border" placeholder="תיאור קצר של האלבום..." autoComplete="off" />
              </div>
              <Button onClick={handleSaveAlbumEdit} disabled={savingAlbum || !editAlbumTitle.trim()} className="w-full gradient-gold text-primary-foreground font-body py-5">
                {savingAlbum ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Albums list
  return (
    <>
    <PageHero image={coverImage} title="גלריית" highlight="תמונות" subtitle="רגעים מיוחדים מאירועי ומפגשי המועדון" />
    
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="font-serif text-2xl font-bold text-foreground md:text-3xl">
          גלריית <span className="text-gold">תמונות</span>
        </h1>
        <Button onClick={() => setShowCreate(true)} className="gradient-gold text-primary-foreground font-body gap-1">
          <Plus className="h-4 w-4" />
          אלבום חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-body text-sm">סינון:</span>
        </div>
        <Input
          placeholder="חיפוש לפי שם / נושא..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="bg-card border-border w-48 sm:w-56"
          autoComplete="off"
        />
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40 font-body bg-card border-border">
            <SelectValue placeholder="חודש" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל החודשים</SelectItem>
            {Array.from({ length: 12 }, (_, i) => {
              const d = new Date(2026, i);
              return (
                <SelectItem key={i} value={String(i)}>
                  {d.toLocaleDateString("he-IL", { month: "long" })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {(filterSearch || filterMonth) && (
          <button onClick={() => { setFilterSearch(""); setFilterMonth(""); }} className="font-body text-xs text-gold hover:underline">
            נקה פילטרים
          </button>
        )}
      </div>

      {(() => {
        let filtered = albums;
        if (filterSearch) {
          const q = filterSearch.toLowerCase();
          filtered = filtered.filter(a => a.title.toLowerCase().includes(q) || (a.description || "").toLowerCase().includes(q));
        }
        if (filterMonth && filterMonth !== "all") {
          filtered = filtered.filter(a => new Date(a.created_at).getMonth() === Number(filterMonth));
        }
        return filtered.length === 0 ? (
          <div className="text-center py-16">
            <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="font-body text-lg text-muted-foreground">
              {albums.length === 0 ? "עדיין אין אלבומים" : "לא נמצאו אלבומים לפי הסינון"}
            </p>
            {albums.length === 0 && <p className="font-body text-sm text-muted-foreground mt-1">צרו אלבום חדש ושתפו תמונות מהמועדון</p>}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((album) => {
              const creator = albumCreators[album.created_by || ""];
              const isPending = !(album as any).is_approved && album.created_by === userId;
              return (
                <div
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className={`group relative overflow-hidden rounded-xl border bg-card cursor-pointer transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 ${isPending ? "border-amber-500/40" : "border-border"}`}
                >
                  {isPending && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-1 text-[10px] font-body text-white">
                      <AlertTriangle className="h-3 w-3" /> ממתין לאישור
                    </div>
                  )}
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
                    <div className="flex items-center justify-between mt-2">
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(album.created_at).toLocaleDateString("he-IL")}
                      </p>
                      {creator && (
                        <p className="font-body text-xs text-gold">{creator.full_name}</p>
                      )}
                    </div>
                  </div>
                  {canManageAlbum(album) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAlbum(album.id); }}
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 text-destructive-foreground rounded-full p-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">אלבום חדש</DialogTitle>
            <DialogDescription className="sr-only">יצירת אלבום תמונות חדש</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="font-body text-sm">שם האלבום <span className="text-gold">*</span></Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-card border-border" placeholder="למשל: מפגש ינואר 2026" autoComplete="off" />
            </div>
            <div>
              <Label className="font-body text-sm">תיאור</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="bg-card border-border" placeholder="תיאור קצר של האלבום..." autoComplete="off" />
            </div>
            <Button onClick={handleCreateAlbum} disabled={creating || !newTitle.trim()} className="w-full gradient-gold text-primary-foreground font-body py-5">
              {creating ? "יוצר..." : "צור אלבום"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    <div className="mx-auto max-w-7xl px-4 py-6">
      <SmartAdBanner placement="sidebar" />
    </div>
    <QuoteSection page="gallery" />
    </>
  );
};

export default Gallery;
