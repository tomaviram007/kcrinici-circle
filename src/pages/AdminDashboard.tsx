import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, Briefcase, Calendar, Megaphone, BarChart3, Image, Shield, Quote, ImageIcon, Award, ChevronDown, Menu, Tv, Package, Mail } from "lucide-react";
import AdminCommunication from "@/components/admin/AdminCommunication";
import AdminEmailPreview from "@/components/admin/AdminEmailPreview";
import AdminMailingList from "@/components/admin/AdminMailingList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AdminJobs from "@/components/admin/AdminJobs";
import AdminEvents from "@/components/admin/AdminEvents";
import AdminAnnouncements from "@/components/admin/AdminAnnouncements";
import AdminPolls from "@/components/admin/AdminPolls";
import AdminQuotes from "@/components/admin/AdminQuotes";
import AdminLogo from "@/components/admin/AdminLogo";
import AdminRecommendations from "@/components/admin/AdminRecommendations";
import AdminCovers from "@/components/admin/AdminCovers";
import AdminDeals from "@/components/admin/AdminDeals";
import AdminAds from "@/components/admin/AdminAds";
import AdminSecondHand from "@/components/admin/AdminSecondHand";
import AdminMembers from "@/components/admin/AdminMembers";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBirthdayWidget from "@/components/admin/AdminBirthdayWidget";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import AdminNotificationCenter from "@/components/admin/AdminNotificationCenter";
import PageHero from "@/components/PageHero";

import heroAdmin from "@/assets/hero-admin.jpg";
import { usePageCover } from "@/hooks/usePageCover";

interface DashboardStats {
  approvedMembers: number;
  pendingMembers: number;
  upcomingEvents: number;
  activeJobs: number;
  activePolls: number;
}

// Map tab IDs to permission keys
const TAB_PERMISSION_MAP: Record<string, string> = {
  members: "manage_members",
  team: "manage_team",
  announcements: "manage_announcements",
  jobs: "manage_jobs",
  events: "manage_events",
  recommendations: "manage_recommendations",
  deals: "manage_deals",
  secondhand: "manage_deals",
  gallery: "manage_gallery",
  polls: "manage_polls",
  quotes: "manage_quotes",
  logo: "manage_settings",
  covers: "manage_quotes",
  ads: "manage_settings",
  communication: "manage_settings",
  mailing: "manage_settings",
};

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "members";
  const [stats, setStats] = useState<DashboardStats>({ approvedMembers: 0, pendingMembers: 0, upcomingEvents: 0, activeJobs: 0, activePolls: 0 });
  const coverImage = usePageCover("admin", heroAdmin);
  const { hasPermission } = useUserPermissions();

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: profiles }, { data: events }, { data: jobs }, { data: polls }] = await Promise.all([
        supabase.from("profiles").select("is_approved, is_removed"),
        supabase.from("events").select("event_date").gte("event_date", new Date().toISOString()),
        supabase.from("jobs").select("is_approved, is_active"),
        supabase.from("polls").select("is_active"),
      ]);
      setStats({
        approvedMembers: (profiles || []).filter(p => p.is_approved && !p.is_removed).length,
        pendingMembers: (profiles || []).filter(p => !p.is_approved && !p.is_removed).length,
        upcomingEvents: (events || []).length,
        activeJobs: (jobs || []).filter(j => j.is_approved && j.is_active).length,
        activePolls: (polls || []).filter(p => p.is_active).length,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "חברים מאושרים", value: stats.approvedMembers, icon: Users, accent: "text-green-500", tab: "members" },
    { label: "ממתינים לאישור", value: stats.pendingMembers, icon: Clock, accent: "text-primary", tab: "members" },
    { label: "אירועים קרובים", value: stats.upcomingEvents, icon: Calendar, accent: "text-blue-500", tab: "events" },
    { label: "משרות פעילות", value: stats.activeJobs, icon: Briefcase, accent: "text-purple-500", tab: "jobs" },
    { label: "סקרים פעילים", value: stats.activePolls, icon: BarChart3, accent: "text-primary", tab: "polls" },
  ];

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <PageHero image={coverImage} title="שולחן" highlight="המנהל" subtitle="ניהול המועדון, אישור חברים ופרסום תוכן" />

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8 overflow-x-hidden">
        {/* Notification center + Stats row */}
        <div className="flex items-center justify-between mb-4" dir="rtl">
          <h2 className="font-serif text-lg font-bold text-foreground">סקירה כללית</h2>
          <AdminNotificationCenter onNavigate={handleTabChange} />
        </div>

        <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 sm:p-4 text-center space-y-1 cursor-pointer transition-all hover:border-gold/30 hover:shadow-[0_0_20px_hsl(43_72%_52%/0.08)]" onClick={() => handleTabChange(s.tab)}>
              <s.icon className={`h-5 w-5 mx-auto ${s.accent}`} />
              <p className="font-serif text-2xl font-bold text-foreground">{s.value}</p>
              <p className="font-body text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <AdminBirthdayWidget />

        {/* Mobile: tab selector dropdown */}
        <div className="block lg:hidden mb-4" dir="rtl">
          <AdminMobileNav activeTab={activeTab} onTabChange={handleTabChange} hasPermission={hasPermission} />
        </div>

        {/* Sidebar + Content layout */}
        <div className="flex gap-6" dir="rtl">
          <div className="hidden lg:block">
            <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} hasPermission={hasPermission} />
          </div>

          <div className="flex-1 min-w-0">
            {activeTab === "members" && hasPermission("manage_members") && <AdminMembers />}
            {activeTab === "announcements" && hasPermission("manage_announcements") && <AdminAnnouncements />}
            {activeTab === "jobs" && hasPermission("manage_jobs") && <AdminJobs />}
            {activeTab === "events" && hasPermission("manage_events") && <AdminEvents />}
            {activeTab === "polls" && hasPermission("manage_polls") && <AdminPolls />}
            {activeTab === "recommendations" && hasPermission("manage_recommendations") && <AdminRecommendations />}
            {activeTab === "gallery" && hasPermission("manage_gallery") && <AdminGalleryApproval />}
            {activeTab === "quotes" && hasPermission("manage_quotes") && <AdminQuotes />}
            {activeTab === "logo" && hasPermission("manage_settings") && <AdminLogo />}
            {activeTab === "covers" && hasPermission("manage_quotes") && <AdminCovers />}
            {activeTab === "deals" && hasPermission("manage_deals") && <AdminDeals />}
            {activeTab === "secondhand" && hasPermission("manage_deals") && <AdminSecondHand />}
            {activeTab === "ads" && hasPermission("manage_settings") && <AdminAds />}
            {activeTab === "communication" && hasPermission("manage_settings") && <AdminCommunication />}
            {activeTab === "email-preview" && hasPermission("manage_settings") && <AdminEmailPreview />}
            {activeTab === "mailing" && hasPermission("manage_settings") && <AdminMailingList />}
            {activeTab === "team" && hasPermission("manage_team") && <AdminTeam />}
            {/* Show access denied message if no permission */}
            {TAB_PERMISSION_MAP[activeTab] && !hasPermission(TAB_PERMISSION_MAP[activeTab]) && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-serif text-lg font-bold text-foreground mb-1">אין הרשאה</p>
                <p className="font-body text-sm text-muted-foreground">אין לך הרשאה לגשת לעמוד זה. פנה למנהל המערכת.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;

// Mobile navigation for admin dashboard
const mobileNavGroups = [
  {
    label: "ניהול חברים",
    items: [
      { id: "members", label: "בקשות הצטרפות", icon: Users },
      { id: "team", label: "צוות", icon: Shield },
    ],
  },
  {
    label: "תוכן קהילתי",
    items: [
      { id: "announcements", label: "מודעות", icon: Megaphone },
      { id: "jobs", label: "דרושים", icon: Briefcase },
      { id: "events", label: "אירועים", icon: Calendar },
      { id: "recommendations", label: "המלצות", icon: Award },
      { id: "deals", label: "הטבות", icon: Briefcase },
      { id: "secondhand", label: "יד שנייה", icon: Package },
    ],
  },
  {
    label: "מדיה ועיצוב",
    items: [
      { id: "gallery", label: "גלריות", icon: Image },
      { id: "logo", label: "לוגו", icon: ImageIcon },
      { id: "covers", label: "קאברים", icon: Image },
    ],
  },
  {
    label: "הגדרות",
    items: [
      { id: "polls", label: "סקרים", icon: BarChart3 },
      { id: "quotes", label: "ציטוטים", icon: Quote },
      { id: "ads", label: "פרסום", icon: Tv },
      { id: "communication", label: "תקשורת", icon: Mail },
    ],
  },
];

const allMobileItems = mobileNavGroups.flatMap((g) => g.items);

const AdminMobileNav = ({ activeTab, onTabChange, hasPermission }: { activeTab: string; onTabChange: (tab: string) => void; hasPermission: (p: string) => boolean }) => {
  const [open, setOpen] = useState(false);
  const activeItem = allMobileItems.find((i) => i.id === activeTab);

  const filteredGroups = mobileNavGroups
    .map(g => ({ ...g, items: g.items.filter(item => {
      const perm = TAB_PERMISSION_MAP[item.id];
      return !perm || hasPermission(perm);
    })}))
    .filter(g => g.items.length > 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-body text-sm border-border/50 bg-card/60 backdrop-blur-xl">
          <span className="flex items-center gap-2">
            {activeItem && <activeItem.icon className="h-4 w-4 text-primary" />}
            {activeItem?.label || "בחר עמוד"}
          </span>
          <Menu className="h-4 w-4 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-4 overflow-y-auto" dir="rtl">
        <p className="font-serif text-lg font-bold text-foreground mb-4">ניווט מהיר</p>
        <nav className="space-y-3">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onTabChange(item.id); setOpen(false); }}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span>{item.label}</span>
                      {isActive && <span className="mr-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

// Gallery Approval Component
const AdminGalleryApproval = () => {
  const { toast } = useToast();
  const [albums, setAlbums] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    const [albumsRes, photosRes] = await Promise.all([
      supabase.from("gallery_albums").select("*").eq("is_approved", false).order("updated_at", { ascending: false }),
      (supabase.from("gallery_photos") as any).select("*").eq("is_approved", false).order("created_at", { ascending: false }),
    ]);
    const pendingPhotos = (photosRes.data as any[]) || [];
    const albumIds = [...new Set(pendingPhotos.map((p) => p.album_id))];
    let albumTitles: Record<string, string> = {};
    if (albumIds.length > 0) {
      const { data: albumsData } = await supabase.from("gallery_albums").select("id, title").in("id", albumIds);
      albumsData?.forEach((a: any) => { albumTitles[a.id] = a.title; });
    }
    setAlbums(albumsRes.data || []);
    setPhotos(pendingPhotos.map((p) => ({ ...p, album_title: albumTitles[p.album_id] })));
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApproveAlbum = async (id: string) => {
    const { error } = await supabase.from("gallery_albums").update({ is_approved: true }).eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "אלבום אושר!" });
    fetchPending();
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!confirm("למחוק את האלבום וכל התמונות שבו?")) return;
    const { error } = await supabase.from("gallery_albums").delete().eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "האלבום נמחק" });
    fetchPending();
  };

  const handleApprovePhoto = async (id: string) => {
    const { error } = await (supabase.from("gallery_photos") as any).update({ is_approved: true }).eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "התמונה אושרה!" });
    fetchPending();
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm("למחוק את התמונה?")) return;
    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "התמונה נמחקה" });
    fetchPending();
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Image className="h-5 w-5 text-gold" /> גלריות ממתינות לאישור ({albums.length})
        </h3>
        {albums.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין גלריות ממתינות לאישור.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {albums.map((album) => (
              <div key={album.id} className="rounded-lg border border-border bg-card p-5">
                <h4 className="font-serif text-lg font-bold text-foreground">{album.title}</h4>
                {album.description && <p className="font-body text-sm text-muted-foreground mt-1">{album.description}</p>}
                <p className="font-body text-xs text-muted-foreground mt-2">{new Date(album.updated_at).toLocaleDateString("he-IL")}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => handleApproveAlbum(album.id)} className="gradient-gold text-primary-foreground font-body">
                    <Check className="h-4 w-4 ml-1" /> אשר
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteAlbum(album.id)} className="font-body">
                    <X className="h-4 w-4 ml-1" /> מחק
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Image className="h-5 w-5 text-gold" /> תמונות ממתינות לאישור ({photos.length})
        </h3>
        {photos.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין תמונות ממתינות לאישור.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="aspect-square bg-muted">
                  <img src={photo.image_url} alt={photo.caption || ""} className="h-full w-full object-cover" />
                </div>
                <div className="p-3 space-y-2">
                  {photo.album_title && (
                    <p className="font-body text-xs text-muted-foreground truncate">אלבום: {photo.album_title}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprovePhoto(photo.id)} className="flex-1 gradient-gold text-primary-foreground font-body">
                      <Check className="h-3.5 w-3.5 ml-1" /> אשר
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePhoto(photo.id)} className="font-body">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Team Management Component
// All available permissions with Hebrew labels
const ALL_PERMISSIONS = [
  { key: "manage_announcements", label: "ניהול מודעות ואישורן" },
  { key: "manage_events", label: "ניהול אירועים" },
  { key: "manage_gallery", label: "ניהול גלריה" },
  { key: "manage_jobs", label: "ניהול משרות" },
  { key: "manage_recommendations", label: "ניהול המלצות" },
  { key: "manage_deals", label: "ניהול הטבות" },
  { key: "manage_polls", label: "ניהול סקרים" },
  { key: "manage_quotes", label: "עריכת ציטוטים וקאברים" },
  { key: "manage_members", label: "ניהול חברים ואישור בקשות" },
  { key: "manage_team", label: "ניהול צוות והרשאות" },
  { key: "manage_settings", label: "שינוי הגדרות מערכת" },
];

// Default permissions per role (used when first assigning a role)
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(p => p.key),
  chief_editor: ["manage_announcements", "manage_events", "manage_gallery", "manage_jobs", "manage_recommendations", "manage_deals", "manage_polls", "manage_quotes"],
  editor: ["manage_announcements", "manage_events", "manage_gallery", "manage_jobs", "manage_recommendations"],
  moderator: ["manage_announcements"],
};

const AdminTeam = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("editor");
  const [adding, setAdding] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [savingPerms, setSavingPerms] = useState<string | null>(null);

  const ROLE_LABELS: Record<string, string> = {
    admin: "מנהל ראשי",
    chief_editor: "עורך ראשי",
    editor: "עורך משני",
    moderator: "מנחה",
  };

  const fetchTeam = async () => {
    const [rolesRes, allMembersRes, permsRes] = await Promise.all([
      supabase.from("user_roles").select("*"),
      supabase.from("profiles").select("user_id, full_name, avatar_url, phone").eq("is_approved", true).eq("is_removed", false).order("full_name"),
      supabase.from("user_permissions").select("*"),
    ]);
    const rolesData = rolesRes.data || [];
    setRoles(rolesData);
    setAllMembers(allMembersRes.data || []);

    // Build permissions map: userId -> granted permission keys
    const permsData = permsRes.data || [];
    const permsMap: Record<string, string[]> = {};
    for (const p of permsData) {
      if (p.granted) {
        if (!permsMap[p.user_id]) permsMap[p.user_id] = [];
        permsMap[p.user_id].push(p.permission);
      }
    }
    setUserPermissions(permsMap);

    const userIds = [...new Set(rolesData.map((r: any) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, profession, avatar_url, phone").in("user_id", userIds);
      setMembers(profiles || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const availableMembers = allMembers.filter(
    (m) => !roles.some((r: any) => r.user_id === m.user_id)
  );

  const sendWhatsAppNotification = (phone: string, name: string, message: string) => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    const formatted = cleaned.startsWith('0') ? '972' + cleaned.slice(1) : cleaned;
    window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleAddRole = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      const member = allMembers.find((m) => m.user_id === selectedUserId);
      const { error } = await supabase.from("user_roles").insert({ user_id: selectedUserId, role: selectedRole } as any);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast({ title: "כבר קיים", description: "לחבר כבר יש תפקיד זה", variant: "destructive" });
        } else {
          throw error;
        }
      } else {
        // Save default permissions for this role
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[selectedRole] || [];
        if (defaultPerms.length > 0) {
          const permRows = defaultPerms.map(p => ({ user_id: selectedUserId, permission: p, granted: true }));
          await supabase.from("user_permissions").upsert(permRows as any, { onConflict: "user_id,permission" });
        }
        const roleName = ROLE_LABELS[selectedRole] || selectedRole;
        toast({ title: "נוסף בהצלחה!", description: `${member?.full_name || "חבר"} קיבל תפקיד ${roleName}` });
        if (member?.phone) {
          const msg = `היי ${member.full_name}, קיבלת תפקיד חדש במועדון: ${roleName}! 🎉\nמעכשיו יש לך הרשאות מתאימות במערכת.\nבהצלחה! 💪\nhttps://kcrinici-circle.lovable.app`;
          sendWhatsAppNotification(member.phone, member.full_name, msg);
        }
        setSelectedUserId("");
      }
      await fetchTeam();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const togglePermission = (userId: string, permKey: string) => {
    setUserPermissions(prev => {
      const current = prev[userId] || [];
      const has = current.includes(permKey);
      return { ...prev, [userId]: has ? current.filter(k => k !== permKey) : [...current, permKey] };
    });
  };

  const savePermissions = async (userId: string) => {
    setSavingPerms(userId);
    try {
      const granted = userPermissions[userId] || [];
      // Delete all existing permissions for this user
      await supabase.from("user_permissions").delete().eq("user_id", userId);
      // Insert granted ones
      if (granted.length > 0) {
        const rows = granted.map(p => ({ user_id: userId, permission: p, granted: true }));
        const { error } = await supabase.from("user_permissions").insert(rows as any);
        if (error) throw error;
      }
      toast({ title: "ההרשאות נשמרו בהצלחה ✅" });
    } catch (err: any) {
      toast({ title: "שגיאה בשמירת הרשאות", description: err.message, variant: "destructive" });
    } finally {
      setSavingPerms(null);
    }
  };

  const handleChangeRole = async (roleId: string, newRole: string) => {
    setChangingRole(roleId);
    try {
      const { error } = await supabase.from("user_roles").update({ role: newRole } as any).eq("id", roleId);
      if (error) throw error;
      const roleEntry = roles.find((r: any) => r.id === roleId);
      const userId = roleEntry?.user_id;
      const member = userId ? allMembers.find((m) => m.user_id === userId) : null;
      // Update permissions to match new role defaults
      if (userId) {
        await supabase.from("user_permissions").delete().eq("user_id", userId);
        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole] || [];
        if (defaultPerms.length > 0) {
          const rows = defaultPerms.map(p => ({ user_id: userId, permission: p, granted: true }));
          await supabase.from("user_permissions").insert(rows as any);
        }
      }
      const roleName = ROLE_LABELS[newRole] || newRole;
      toast({ title: "התפקיד עודכן בהצלחה" });
      if (member?.phone) {
        const msg = `היי ${member.full_name}, התפקיד שלך במועדון עודכן ל: ${roleName}.\nההרשאות שלך עודכנו בהתאם.\nhttps://kcrinici-circle.lovable.app`;
        sendWhatsAppNotification(member.phone, member.full_name, msg);
      }
      await fetchTeam();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setChangingRole(null);
    }
  };
  const handleRemoveRole = async (roleId: string) => {
    const roleEntry = roles.find((r: any) => r.id === roleId);
    if (roleEntry) {
      await supabase.from("user_permissions").delete().eq("user_id", roleEntry.user_id);
    }
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "התפקיד הוסר" });
    fetchTeam();
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-6">
      <h3 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
        <Shield className="h-5 w-5 text-gold" /> ניהול צוות
      </h3>

      {/* Add role form */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <p className="font-body text-sm text-gold font-medium">הוסף חבר צוות</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="bg-background flex-1 font-body">
              <SelectValue placeholder="בחר חבר מועדון..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {availableMembers.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id} className="font-body">
                  {m.full_name}
                </SelectItem>
              ))}
              {availableMembers.length === 0 && (
                <p className="text-sm text-muted-foreground p-2 text-center font-body">אין חברים זמינים</p>
              )}
            </SelectContent>
          </Select>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-40 font-body bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chief_editor">עורך ראשי</SelectItem>
              <SelectItem value="editor">עורך משני</SelectItem>
              <SelectItem value="moderator">מנחה</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleAddRole} disabled={adding || !selectedUserId} className="gradient-gold text-primary-foreground font-body">
            {adding ? "מוסיף..." : "הוסף"}
          </Button>
        </div>
      </div>

      {/* Team list */}
      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => {
          const member = members.find((m: any) => m.user_id === role.user_id);
          const isExpanded = expandedRoleId === role.id;
          const grantedPerms = userPermissions[role.user_id] || [];
          const isAdmin = role.role === "admin";
          return (
            <div key={role.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                >
                  <div className="h-10 w-10 rounded-full bg-secondary border border-gold/20 flex items-center justify-center overflow-hidden shrink-0">
                    {member?.avatar_url ? (
                      <img src={member.avatar_url} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <Users className="h-5 w-5 text-gold" />
                    )}
                  </div>
                  <div>
                    <p className="font-serif text-sm font-bold text-foreground">{member?.full_name || "משתמש"}</p>
                    <p className="font-body text-xs text-gold">{ROLE_LABELS[role.role] || role.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveRole(role.id)} className="text-destructive hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border pt-3 space-y-3">
                  <p className="font-body text-xs font-semibold text-gold mb-2">הרשאות:</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ALL_PERMISSIONS.map((perm) => {
                      const isGranted = isAdmin || grantedPerms.includes(perm.key);
                      return (
                        <label
                          key={perm.key}
                          className={`flex items-center gap-2 font-body text-xs cursor-pointer rounded px-2 py-1.5 transition-colors ${
                            isGranted ? "bg-accent/30 text-foreground" : "text-muted-foreground"
                          } ${isAdmin ? "opacity-60 cursor-default" : "hover:bg-accent/20"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isGranted}
                            disabled={isAdmin}
                            onChange={() => togglePermission(role.user_id, perm.key)}
                            className="accent-gold h-3.5 w-3.5 rounded"
                          />
                          <span>{perm.label}</span>
                          {isGranted ? (
                            <span className="mr-auto text-emerald-500 text-[10px]">✓</span>
                          ) : (
                            <span className="mr-auto text-destructive text-[10px]">✗</span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {!isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => savePermissions(role.user_id)}
                      disabled={savingPerms === role.user_id}
                      className="gradient-gold text-primary-foreground font-body w-full text-xs h-8"
                    >
                      {savingPerms === role.user_id ? "שומר..." : "שמור הרשאות"}
                    </Button>
                  )}

                  {!isAdmin && (
                    <div className="border-t border-border pt-3">
                      <p className="font-body text-xs font-semibold text-gold mb-2">שנה תפקיד:</p>
                      <Select
                        value={role.role}
                        onValueChange={(newRole) => handleChangeRole(role.id, newRole)}
                        disabled={changingRole === role.id}
                      >
                        <SelectTrigger className="w-full font-body bg-background text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chief_editor">עורך ראשי</SelectItem>
                          <SelectItem value="editor">עורך משני</SelectItem>
                          <SelectItem value="moderator">מנחה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
