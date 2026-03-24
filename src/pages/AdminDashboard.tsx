import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, Briefcase, Calendar, Megaphone, BarChart3, Image, Shield, Quote, ImageIcon, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import AdminJobs from "@/components/admin/AdminJobs";
import AdminEvents from "@/components/admin/AdminEvents";
import AdminAnnouncements from "@/components/admin/AdminAnnouncements";
import AdminPolls from "@/components/admin/AdminPolls";
import AdminQuotes from "@/components/admin/AdminQuotes";
import AdminLogo from "@/components/admin/AdminLogo";
import AdminRecommendations from "@/components/admin/AdminRecommendations";
import AdminCovers from "@/components/admin/AdminCovers";
import AdminDeals from "@/components/admin/AdminDeals";
import AdminMembers from "@/components/admin/AdminMembers";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBirthdayWidget from "@/components/admin/AdminBirthdayWidget";
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

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "members";
  const [stats, setStats] = useState<DashboardStats>({ approvedMembers: 0, pendingMembers: 0, upcomingEvents: 0, activeJobs: 0, activePolls: 0 });
  const coverImage = usePageCover("admin", heroAdmin);

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data: profiles }, { data: events }, { data: jobs }, { data: polls }] = await Promise.all([
        supabase.from("profiles").select("is_approved"),
        supabase.from("events").select("event_date").gte("event_date", new Date().toISOString()),
        supabase.from("jobs").select("is_approved, is_active"),
        supabase.from("polls").select("is_active"),
      ]);
      setStats({
        approvedMembers: (profiles || []).filter(p => p.is_approved).length,
        pendingMembers: (profiles || []).filter(p => !p.is_approved).length,
        upcomingEvents: (events || []).length,
        activeJobs: (jobs || []).filter(j => j.is_approved && j.is_active).length,
        activePolls: (polls || []).filter(p => p.is_active).length,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "חברים מאושרים", value: stats.approvedMembers, icon: Users, accent: "text-green-500" },
    { label: "ממתינים לאישור", value: stats.pendingMembers, icon: Clock, accent: "text-primary" },
    { label: "אירועים קרובים", value: stats.upcomingEvents, icon: Calendar, accent: "text-blue-500" },
    { label: "משרות פעילות", value: stats.activeJobs, icon: Briefcase, accent: "text-purple-500" },
    { label: "סקרים פעילים", value: stats.activePolls, icon: BarChart3, accent: "text-primary" },
  ];

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <>
      <PageHero image={coverImage} title="שולחן" highlight="המנהל" subtitle="ניהול המועדון, אישור חברים ופרסום תוכן" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 overflow-x-hidden">
        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center space-y-1">
              <s.icon className={`h-5 w-5 mx-auto ${s.accent}`} />
              <p className="font-serif text-2xl font-bold text-foreground">{s.value}</p>
              <p className="font-body text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <AdminBirthdayWidget />

        {/* Sidebar + Content layout */}
        <div className="flex gap-6" dir="rtl">
          <AdminSidebar activeTab={activeTab} onTabChange={handleTabChange} />

          <div className="flex-1 min-w-0">
            {activeTab === "members" && <AdminMembers />}
            {activeTab === "announcements" && <AdminAnnouncements />}
            {activeTab === "jobs" && <AdminJobs />}
            {activeTab === "events" && <AdminEvents />}
            {activeTab === "polls" && <AdminPolls />}
            {activeTab === "recommendations" && <AdminRecommendations />}
            {activeTab === "gallery" && <AdminGalleryApproval />}
            {activeTab === "quotes" && <AdminQuotes />}
            {activeTab === "logo" && <AdminLogo />}
            {activeTab === "covers" && <AdminCovers />}
            {activeTab === "deals" && <AdminDeals />}
            {activeTab === "team" && <AdminTeam />}
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;

// Gallery Approval Component
const AdminGalleryApproval = () => {
  const { toast } = useToast();
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    const { data } = await supabase.from("gallery_albums").select("*").eq("is_approved", false).order("updated_at", { ascending: false });
    setAlbums(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPending(); }, []);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("gallery_albums").update({ is_approved: true }).eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "אלבום אושר!" });
    fetchPending();
  };

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
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
                <Button size="sm" onClick={() => handleApprove(album.id)} className="gradient-gold text-primary-foreground font-body">
                  <Check className="h-4 w-4 ml-1" /> אשר
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Team Management Component
const AdminTeam = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("editor");
  const [adding, setAdding] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    admin: "מנהל ראשי",
    chief_editor: "עורך ראשי",
    editor: "עורך משני",
    moderator: "מנחה",
  };

  const fetchTeam = async () => {
    const { data: rolesData } = await supabase.from("user_roles").select("*");
    setRoles(rolesData || []);

    const userIds = [...new Set((rolesData || []).map((r: any) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, profession, avatar_url").in("user_id", userIds);
      setMembers(profiles || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleAddRole = async () => {
    if (!searchEmail.trim()) return;
    setAdding(true);
    try {
      // Find user by name
      const { data: profile } = await supabase.from("profiles").select("user_id, full_name").ilike("full_name", `%${searchEmail.trim()}%`).maybeSingle();
      if (!profile) {
        toast({ title: "לא נמצא", description: "לא נמצא חבר עם השם הזה", variant: "destructive" });
        setAdding(false);
        return;
      }
      const { error } = await supabase.from("user_roles").insert({ user_id: profile.user_id, role: selectedRole } as any);
      if (error) {
        if (error.message.includes("duplicate")) {
          toast({ title: "כבר קיים", description: "לחבר כבר יש תפקיד זה", variant: "destructive" });
        } else {
          throw error;
        }
      } else {
        toast({ title: "נוסף בהצלחה!", description: `${profile.full_name} קיבל תפקיד ${ROLE_LABELS[selectedRole] || selectedRole}` });
        setSearchEmail("");
      }
      await fetchTeam();
    } catch (err: any) {
      toast({ title: "שגיאה", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
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
          <Input
            placeholder="חפש לפי שם חבר..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="bg-background flex-1"
            autoComplete="off"
          />
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
          <Button onClick={handleAddRole} disabled={adding || !searchEmail.trim()} className="gradient-gold text-primary-foreground font-body">
            {adding ? "מוסיף..." : "הוסף"}
          </Button>
        </div>
      </div>

      {/* Team list */}
      <div className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => {
          const member = members.find((m: any) => m.user_id === role.user_id);
          return (
            <div key={role.id} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary border border-gold/20 flex items-center justify-center overflow-hidden">
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
              {role.role !== "admin" && (
                <Button size="sm" variant="ghost" onClick={() => handleRemoveRole(role.id)} className="text-destructive hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
