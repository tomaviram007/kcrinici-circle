import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Plus, Building2, BarChart3, Eye, MousePointerClick, Trash2, Pencil, Upload, X, Calendar, Link2, Image as ImageIcon, Video, Users, HelpCircle, AlertTriangle } from "lucide-react";
import AdReportExport from "./AdReportExport";

/* ─── types ─── */
interface Advertiser {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  advertiser_id: string;
  title: string;
  media_type: string;
  media_url: string;
  target_url: string;
  placement: string;
  target_page: string;
  max_appearances: number;
  alt_text: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  price: number;
  priority: number;
  impression_count: number;
  click_count: number;
  created_at: string;
}

const PLACEMENT_LABELS: Record<string, string> = {
  premium: "פרימיום – מיקום בולט",
  hero: "Hero – ראש העמוד",
  sidebar: "סרגל צד",
  inline: "בין תכנים",
  between_content: "בין סקשנים",
  inline_repeat: "חוזר ברשימה (כל X פריטים)",
};

const PAGE_LABELS: Record<string, string> = {
  all: "כל העמודים",
  home: "דף הבית",
  announcements: "לוח מודעות",
  members: "חברי המועדון",
  events: "אירועים",
  gallery: "גלריה",
};

/* ─── Field label with tooltip ─── */
const FieldLabel = ({ label, tooltip, required }: { label: string; tooltip: string; required?: boolean }) => (
  <div className="flex items-center gap-1.5 mb-1">
    <Label>{label}{required && " *"}</Label>
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs font-body leading-relaxed">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);
const AdminAds = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState("campaigns");
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // advertiser form
  const [advDialog, setAdvDialog] = useState(false);
  const [advForm, setAdvForm] = useState({ business_name: "", contact_name: "", phone: "", email: "", notes: "" });
  const [editingAdv, setEditingAdv] = useState<string | null>(null);

  // campaign form
  const [campDialog, setCampDialog] = useState(false);
  const [campForm, setCampForm] = useState({
    advertiser_id: "", title: "", media_type: "image", target_url: "", placement: "premium",
    target_page: "all", max_appearances: 1,
    alt_text: "", start_date: "", end_date: "", is_active: true, price: 0, priority: 0,
  });
  const [editingCamp, setEditingCamp] = useState<string | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // selected advertiser detail
  const [selectedAdv, setSelectedAdv] = useState<string | null>(null);

  const fetchAll = async () => {
    const [{ data: adv }, { data: camp }] = await Promise.all([
      supabase.from("advertisers" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("ad_campaigns" as any).select("*").order("created_at", { ascending: false }),
    ]);
    setAdvertisers((adv as any[]) || []);
    setCampaigns((camp as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  /* ─── KPI calculations ─── */
  const now = new Date();
  const activeCampaigns = campaigns.filter(c => c.is_active && new Date(c.start_date) <= now && (!c.end_date || new Date(c.end_date) >= now));
  const totalClicks = campaigns.reduce((s, c) => s + c.click_count, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impression_count, 0);
  const expectedRevenue = activeCampaigns.reduce((s, c) => s + (c.price || 0), 0);

  /* ─── Expiring soon (within 3 days) ─── */
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringSoon = campaigns.filter(c => {
    if (!c.end_date) return false;
    const end = new Date(c.end_date);
    return c.is_active && end >= now && end <= threeDaysFromNow;
  });

  /* ─── Advertiser CRUD ─── */
  const saveAdvertiser = async () => {
    if (!advForm.business_name.trim()) { toast({ title: "שם העסק חובה", variant: "destructive" }); return; }
    if (editingAdv) {
      const { error } = await supabase.from("advertisers" as any).update(advForm).eq("id", editingAdv);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "מפרסם עודכן" });
    } else {
      const { error } = await supabase.from("advertisers" as any).insert(advForm);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "מפרסם נוסף" });
    }
    setAdvDialog(false);
    setEditingAdv(null);
    setAdvForm({ business_name: "", contact_name: "", phone: "", email: "", notes: "" });
    fetchAll();
  };

  const deleteAdvertiser = async (id: string) => {
    if (!confirm("למחוק את המפרסם וכל הקמפיינים שלו?")) return;
    await supabase.from("advertisers" as any).delete().eq("id", id);
    toast({ title: "מפרסם נמחק" });
    setSelectedAdv(null);
    fetchAll();
  };

  const openEditAdv = (adv: Advertiser) => {
    setAdvForm({ business_name: adv.business_name, contact_name: adv.contact_name || "", phone: adv.phone || "", email: adv.email || "", notes: adv.notes || "" });
    setEditingAdv(adv.id);
    setAdvDialog(true);
  };

  /* ─── Image compression ─── */
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }));
            } else {
              resolve(file);
            }
          },
          "image/webp",
          quality
        );
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  /* ─── Campaign CRUD ─── */
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    if (isVideo && !file.type.includes("mp4")) { toast({ title: "רק קבצי MP4 נתמכים", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "קובץ גדול מ-10MB", variant: "destructive" }); return; }
    setMediaFile(file);
    setCampForm(f => ({ ...f, media_type: isVideo ? "video" : "image" }));
    setMediaPreview(URL.createObjectURL(file));
  };

  const saveCampaign = async () => {
    if (!campForm.advertiser_id || !campForm.title || !campForm.target_url || !campForm.start_date) {
      toast({ title: "יש למלא את כל השדות הנדרשים", variant: "destructive" }); return;
    }
    setUploading(true);

    let media_url = "";
    if (mediaFile) {
      // Compress images before upload
      const fileToUpload = await compressImage(mediaFile);
      const ext = fileToUpload.name.split(".").pop();
      const path = `campaigns/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ads").upload(path, fileToUpload);
      if (upErr) { toast({ title: "שגיאת העלאה", description: upErr.message, variant: "destructive" }); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("ads").getPublicUrl(path);
      media_url = urlData.publicUrl;
    } else if (editingCamp) {
      const existing = campaigns.find(c => c.id === editingCamp);
      media_url = existing?.media_url || "";
    }

    if (!media_url) { toast({ title: "יש להעלות קובץ מדיה", variant: "destructive" }); setUploading(false); return; }

    const payload = {
      ...campForm,
      media_url,
      start_date: new Date(campForm.start_date).toISOString(),
      end_date: campForm.end_date ? new Date(campForm.end_date).toISOString() : null,
    };

    if (editingCamp) {
      const { error } = await supabase.from("ad_campaigns" as any).update(payload).eq("id", editingCamp);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); setUploading(false); return; }
      toast({ title: "קמפיין עודכן" });
    } else {
      const { error } = await supabase.from("ad_campaigns" as any).insert(payload);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); setUploading(false); return; }
      toast({ title: "קמפיין נוצר" });
    }

    setUploading(false);
    setCampDialog(false);
    setEditingCamp(null);
    setMediaFile(null);
    setMediaPreview(null);
    setCampForm({ advertiser_id: "", title: "", media_type: "image", target_url: "", placement: "premium", target_page: "all", max_appearances: 1, alt_text: "", start_date: "", end_date: "", is_active: true, price: 0, priority: 0 });
    fetchAll();
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("למחוק קמפיין זה?")) return;
    await supabase.from("ad_campaigns" as any).delete().eq("id", id);
    toast({ title: "קמפיין נמחק" });
    fetchAll();
  };

  const toggleCampaign = async (id: string, active: boolean) => {
    await supabase.from("ad_campaigns" as any).update({ is_active: active }).eq("id", id);
    fetchAll();
  };

  const openEditCamp = (c: Campaign) => {
    setCampForm({
      advertiser_id: c.advertiser_id, title: c.title, media_type: c.media_type, target_url: c.target_url,
      placement: c.placement, target_page: (c as any).target_page || "all", max_appearances: (c as any).max_appearances || 1,
      alt_text: c.alt_text || "", start_date: c.start_date.slice(0, 16), end_date: c.end_date ? c.end_date.slice(0, 16) : "",
      is_active: c.is_active, price: c.price, priority: c.priority,
    });
    setEditingCamp(c.id);
    setMediaPreview(c.media_url);
    setCampDialog(true);
  };

  const getCampaignStatus = (c: Campaign) => {
    if (!c.is_active) return { label: "מושבת", color: "bg-muted text-muted-foreground" };
    const s = new Date(c.start_date);
    if (now < s) return { label: "מתוזמן", color: "bg-blue-500/15 text-blue-600" };
    if (c.end_date) {
      const e = new Date(c.end_date);
      if (now > e) return { label: "הסתיים", color: "bg-red-500/15 text-red-600" };
    }
    return { label: c.end_date ? "פעיל" : "פעיל (ללא הגבלה)", color: "bg-green-500/15 text-green-600" };
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div dir="rtl">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "באנרים פעילים", value: activeCampaigns.length, icon: ImageIcon, color: "text-green-500" },
          { label: "צפיות כולל", value: totalImpressions, icon: Eye, color: "text-blue-500" },
          { label: "קליקים כולל", value: totalClicks, icon: MousePointerClick, color: "text-purple-500" },
          { label: "הכנסה צפויה", value: `₪${expectedRevenue.toLocaleString()}`, icon: BarChart3, color: "text-primary" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
            <kpi.icon className={cn("h-5 w-5 mx-auto", kpi.color)} />
            <p className="font-serif text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="font-body text-xs text-muted-foreground">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Expiring campaigns alert */}
      {expiringSoon.length > 0 && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h4 className="font-serif font-bold text-yellow-600">קמפיינים שעומדים להסתיים בקרוב</h4>
          </div>
          <div className="space-y-1">
            {expiringSoon.map(c => {
              const adv = advertisers.find(a => a.id === c.advertiser_id);
              const daysLeft = Math.ceil((new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <p key={c.id} className="text-sm text-yellow-700">
                  <strong>{c.title}</strong> ({adv?.business_name}) – מסתיים בעוד {daysLeft} {daysLeft === 1 ? "יום" : "ימים"}
                </p>
              );
            })}
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="campaigns" className="gap-1.5"><ImageIcon className="h-4 w-4" />קמפיינים</TabsTrigger>
          <TabsTrigger value="advertisers" className="gap-1.5"><Building2 className="h-4 w-4" />מפרסמים</TabsTrigger>
        </TabsList>

        {/* ── Campaigns Tab ── */}
        <TabsContent value="campaigns">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-gold" /> ניהול קמפיינים
            </h3>
            <Button size="sm" onClick={() => { setCampDialog(true); setEditingCamp(null); setMediaPreview(null); setMediaFile(null); setCampForm({ advertiser_id: "", title: "", media_type: "image", target_url: "", placement: "premium", target_page: "all", max_appearances: 1, alt_text: "", start_date: "", end_date: "", is_active: true, price: 0, priority: 0 }); }}>
              <Plus className="h-4 w-4 ml-1" /> קמפיין חדש
            </Button>
          </div>

          {campaigns.length === 0 ? (
            <p className="text-muted-foreground font-body text-center py-8">אין קמפיינים עדיין. צור את הראשון!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {campaigns.map(c => {
                const adv = advertisers.find(a => a.id === c.advertiser_id);
                const status = getCampaignStatus(c);
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* media preview */}
                    <div className="relative h-32 bg-muted/50 flex items-center justify-center">
                      {c.media_type === "video" ? (
                        <video src={c.media_url} className="absolute inset-0 w-full h-full object-cover" muted playsInline controls={false} />
                      ) : (
                        <>
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${c.media_url})` }}
                          />
                          <img
                            src={c.media_url}
                            alt={c.alt_text || c.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="eager"
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (!img.dataset.retried) {
                                img.dataset.retried = "1";
                                img.src = c.media_url + (c.media_url.includes("?") ? "&" : "?") + "t=" + Date.now();
                              } else {
                                img.style.display = "none";
                              }
                            }}
                          />
                          {/* Fallback icon when no image loads */}
                          <ImageIcon className="h-8 w-8 text-muted-foreground/30 z-0" />
                        </>
                      )}
                      <span className={cn("absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full z-10", status.color)}>{status.label}</span>
                      <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/80 backdrop-blur z-10">{PLACEMENT_LABELS[c.placement]}</span>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-serif font-bold text-foreground">{c.title}</h4>
                          <p className="text-xs text-muted-foreground">{adv?.business_name || "—"}</p>
                        </div>
                        <p className="text-sm font-bold text-primary">₪{c.price?.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{c.impression_count}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{c.click_count}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{c.end_date ? new Date(c.end_date).toLocaleDateString("he-IL") : "ללא הגבלה"}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleCampaign(c.id, v)} />
                        <Button size="sm" variant="ghost" onClick={() => openEditCamp(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteCampaign(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Advertisers Tab ── */}
        <TabsContent value="advertisers">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gold" /> ניהול מפרסמים
            </h3>
            <Button size="sm" onClick={() => { setAdvDialog(true); setEditingAdv(null); setAdvForm({ business_name: "", contact_name: "", phone: "", email: "", notes: "" }); }}>
              <Plus className="h-4 w-4 ml-1" /> מפרסם חדש
            </Button>
          </div>

          {advertisers.length === 0 ? (
            <p className="text-muted-foreground font-body text-center py-8">אין מפרסמים עדיין.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {advertisers.map(adv => {
                const advCampaigns = campaigns.filter(c => c.advertiser_id === adv.id);
                const activeCount = advCampaigns.filter(c => c.is_active && new Date(c.start_date) <= now && (!c.end_date || new Date(c.end_date) >= now)).length;
                return (
                  <div key={adv.id} className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-gold/30 transition-all" onClick={() => setSelectedAdv(adv.id)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-serif font-bold text-foreground">{adv.business_name}</h4>
                        <p className="text-xs text-muted-foreground">{adv.contact_name || "—"}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{activeCount} פעילים</span>
                    </div>
                    {adv.phone && <p className="text-xs text-muted-foreground mt-1">📞 {adv.phone}</p>}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditAdv(adv); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); deleteAdvertiser(adv.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Advertiser Detail Modal ── */}
      <Dialog open={!!selectedAdv} onOpenChange={() => setSelectedAdv(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle className="font-serif">כרטיסיית מפרסם</DialogTitle></DialogHeader>
          {selectedAdv && (() => {
            const adv = advertisers.find(a => a.id === selectedAdv)!;
            const advCamps = campaigns.filter(c => c.advertiser_id === selectedAdv);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">שם העסק:</span> <strong>{adv.business_name}</strong></div>
                  <div><span className="text-muted-foreground">איש קשר:</span> {adv.contact_name || "—"}</div>
                  <div><span className="text-muted-foreground">טלפון:</span> {adv.phone || "—"}</div>
                  <div><span className="text-muted-foreground">אימייל:</span> {adv.email || "—"}</div>
                </div>
                {adv.notes && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{adv.notes}</p>}
                <AdReportExport advertiser={adv} campaigns={advCamps} />
                <h4 className="font-serif font-bold">קמפיינים ({advCamps.length})</h4>
                {advCamps.length === 0 ? <p className="text-sm text-muted-foreground">אין קמפיינים למפרסם זה.</p> : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {advCamps.map(c => {
                      const status = getCampaignStatus(c);
                      return (
                        <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <div className="h-10 w-16 rounded overflow-hidden bg-muted/50 shrink-0" style={{ backgroundImage: `url(${c.media_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{c.title}</p>
                            <p className="text-xs text-muted-foreground">{PLACEMENT_LABELS[c.placement]} · <Eye className="inline h-3 w-3" /> {c.impression_count} · <MousePointerClick className="inline h-3 w-3" /> {c.click_count}</p>
                          </div>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", status.color)}>{status.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Advertiser Form Dialog ── */}
      <Dialog open={advDialog} onOpenChange={setAdvDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle className="font-serif">{editingAdv ? "עריכת מפרסם" : "מפרסם חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>שם העסק *</Label><Input value={advForm.business_name} onChange={e => setAdvForm(f => ({ ...f, business_name: e.target.value }))} /></div>
            <div><Label>איש קשר</Label><Input value={advForm.contact_name} onChange={e => setAdvForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>טלפון</Label><Input value={advForm.phone} onChange={e => setAdvForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>אימייל</Label><Input type="email" value={advForm.email} onChange={e => setAdvForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div><Label>הערות</Label><Textarea value={advForm.notes} onChange={e => setAdvForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <Button onClick={saveAdvertiser} className="w-full">{editingAdv ? "עדכן" : "הוסף"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Campaign Form Dialog ── */}
      <Dialog open={campDialog} onOpenChange={setCampDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="font-serif">{editingCamp ? "עריכת קמפיין" : "קמפיין חדש"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <FieldLabel label="מפרסם" tooltip="בחר את העסק שעבורו נוצר הקמפיין. אם העסק לא מופיע, הוסף אותו קודם בטאב 'מפרסמים'." required />
              <Select value={campForm.advertiser_id} onValueChange={v => setCampForm(f => ({ ...f, advertiser_id: v }))}>
                <SelectTrigger><SelectValue placeholder="בחר מפרסם" /></SelectTrigger>
                <SelectContent>{advertisers.map(a => <SelectItem key={a.id} value={a.id}>{a.business_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel label="כותרת קמפיין" tooltip="שם פנימי לזיהוי הקמפיין בלוח הניהול. לא מוצג לגולשים." required />
              <Input value={campForm.title} onChange={e => setCampForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            {/* media upload */}
            <div>
              <FieldLabel label="מדיה (תמונה / MP4)" tooltip="הקובץ שיוצג כבאנר באתר. פורמטים נתמכים: JPG, PNG, WebP או וידאו MP4. מקסימום 10MB." required />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4" onChange={handleMediaChange} className="hidden" />
              {mediaPreview ? (
                <div className="relative mt-2 min-h-40 rounded-lg overflow-hidden border border-border bg-muted/30">
                  {campForm.media_type === "video" ? (
                    <video src={mediaPreview} className="w-full h-40 object-cover" muted controls playsInline />
                  ) : (
                    <div className="relative w-full h-40">
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${mediaPreview})` }}
                      />
                      <img
                        src={mediaPreview}
                        className="relative w-full h-full object-cover"
                        alt="תצוגה מקדימה"
                        loading="eager"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (!img.dataset.retried) {
                            img.dataset.retried = "1";
                            img.src = mediaPreview + (mediaPreview.includes("?") ? "&" : "?") + "t=" + Date.now();
                          } else {
                            img.style.display = "none";
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <button type="button" onClick={() => { setMediaPreview(null); setMediaFile(null); }} className="bg-background/80 rounded-full p-1 hover:bg-background transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                  <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-2 left-2 bg-background/80 rounded-full px-2 py-1 text-[10px] font-medium hover:bg-background transition-colors">
                    החלף מדיה
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50">
                  <Upload className="h-6 w-6" />
                  <span className="text-sm">גרור או לחץ להעלאה</span>
                </button>
              )}
            </div>

            <div>
              <FieldLabel label="קישור יעד" tooltip="הכתובת שאליה הגולש יועבר בלחיצה על הבאנר. למשל: אתר המפרסם, דף נחיתה או קישור לוואטסאפ." required />
              <Input value={campForm.target_url} onChange={e => setCampForm(f => ({ ...f, target_url: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="עמוד יעד" tooltip="באיזה עמוד הקמפיין יוצג. 'כל העמודים' יציג בכל מקום שיש שטח פרסום מתאים." required />
                <Select value={campForm.target_page} onValueChange={v => setCampForm(f => ({ ...f, target_page: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAGE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel label="סוג מיקום" tooltip="פרימיום – מיקום בולט, Hero – בראש העמוד, סרגל צד – בצד, בין תכנים – בין סקשנים, חוזר ברשימה – כל X פריטים." required />
                <Select value={campForm.placement} onValueChange={v => setCampForm(f => ({ ...f, placement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="כמות הופעות בעמוד" tooltip="כמה פעמים המודעה תוצג באותו עמוד (מקסימום 4). רלוונטי למיקומי 'חוזר ברשימה'." />
                <Input type="number" min={1} max={4} value={campForm.max_appearances} onChange={e => setCampForm(f => ({ ...f, max_appearances: Math.min(4, Math.max(1, Number(e.target.value))) }))} />
              </div>
              <div>
                <FieldLabel label="עדיפות" tooltip="מספר גבוה יותר = הבאנר יוצג ראשון ברוטציה. ברירת מחדל 0 (רגיל)." />
                <Input type="number" value={campForm.priority} onChange={e => setCampForm(f => ({ ...f, priority: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="תאריך התחלה" tooltip="מתי הבאנר יתחיל להופיע באתר. לפני תאריך זה הקמפיין יהיה בסטטוס 'מתוזמן'." required />
                <Input type="datetime-local" value={campForm.start_date} onChange={e => setCampForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <FieldLabel label="תאריך סיום" tooltip="מתי הבאנר יפסיק להופיע. השאר ריק כדי שהקמפיין ירוץ ללא הגבלת זמן עד שמכבים אותו ידנית." />
                <Input type="datetime-local" value={campForm.end_date} onChange={e => setCampForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel label="מחיר (₪)" tooltip="הסכום שהמפרסם משלם עבור קמפיין זה. משמש לחישוב הכנסה צפויה בדשבורד." />
                <Input type="number" value={campForm.price} onChange={e => setCampForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div>
                <FieldLabel label="Alt Text" tooltip="תיאור טקסטואלי של הבאנר לטובת נגישות וקוראי מסך. חשוב לעמידה בתקני WCAG." />
                <Input value={campForm.alt_text} onChange={e => setCampForm(f => ({ ...f, alt_text: e.target.value }))} placeholder="תיאור לקורא מסך" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={campForm.is_active} onCheckedChange={v => setCampForm(f => ({ ...f, is_active: v }))} />
              <FieldLabel label="פעיל" tooltip="כיבוי מפסיק את הצגת הבאנר באתר מיידית, ללא קשר לתאריכים." />
            </div>

            <Button onClick={saveCampaign} disabled={uploading} className="w-full">
              {uploading ? "מעלה..." : editingCamp ? "עדכן קמפיין" : "צור קמפיין"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAds;
