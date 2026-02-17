import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, Briefcase, Calendar, Megaphone, BarChart3 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminJobs from "@/components/admin/AdminJobs";
import AdminEvents from "@/components/admin/AdminEvents";
import AdminAnnouncements from "@/components/admin/AdminAnnouncements";
import AdminPolls from "@/components/admin/AdminPolls";
import PageHero from "@/components/PageHero";
import ClubAboutSection from "@/components/ClubAboutSection";
import heroAdmin from "@/assets/hero-admin.jpg";

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

  const tabs = [
    { id: "members", label: "בקשות הצטרפות", icon: Users },
    { id: "announcements", label: "מודעות", icon: Megaphone },
    { id: "jobs", label: "דרושים", icon: Briefcase },
    { id: "events", label: "אירועים", icon: Calendar },
    { id: "polls", label: "סקרים", icon: BarChart3 },
  ];

  const statCards = [
    { label: "חברים מאושרים", value: stats.approvedMembers, icon: Users, accent: "text-green-500" },
    { label: "ממתינים לאישור", value: stats.pendingMembers, icon: Clock, accent: "text-gold" },
    { label: "אירועים קרובים", value: stats.upcomingEvents, icon: Calendar, accent: "text-blue-500" },
    { label: "משרות פעילות", value: stats.activeJobs, icon: Briefcase, accent: "text-purple-500" },
    { label: "סקרים פעילים", value: stats.activePolls, icon: BarChart3, accent: "text-gold" },
  ];

  return (
    <>
      <PageHero image={heroAdmin} title="שולחן" highlight="המנהל" subtitle="ניהול המועדון, אישור חברים ופרסום תוכן" />
      <ClubAboutSection />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 overflow-x-hidden">
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

        <div className="mb-6 sm:mb-8 flex gap-1 sm:gap-2 overflow-x-auto border-b border-border pb-px -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-t-md px-2.5 sm:px-4 py-2 sm:py-2.5 font-body text-xs sm:text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-gold text-gold bg-secondary/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "members" && <MemberRequests />}
        {activeTab === "announcements" && <AdminAnnouncements />}
        {activeTab === "jobs" && <AdminJobs />}
        {activeTab === "events" && <AdminEvents />}
        {activeTab === "polls" && <AdminPolls />}
      </div>
    </>
  );
};

const MemberRequests = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
    const channel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => { fetchProfiles(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: true }).eq("user_id", userId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    supabase.functions.invoke("notify-member", { body: { userId, action: "approve" } });
    toast({ title: "אושר!", description: "החבר אושר בהצלחה והודעה נשלחה." });
    fetchProfiles();
  };

  const handleReject = async (userId: string) => {
    const { error } = await supabase.from("profiles").update({ is_approved: false }).eq("user_id", userId);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    supabase.functions.invoke("notify-member", { body: { userId, action: "reject" } });
    toast({ title: "נדחה", description: "הבקשה נדחתה והודעה נשלחה." });
    fetchProfiles();
  };

  const pending = profiles.filter((p) => !p.is_approved);
  const approved = profiles.filter((p) => p.is_approved);

  if (loading) return <p className="text-muted-foreground font-body">טוען...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" /> ממתינים לאישור ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין בקשות ממתינות.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-5">
                <h4 className="font-serif text-lg font-bold text-foreground">{p.full_name}</h4>
                <p className="font-body text-sm text-muted-foreground">{p.profession} {p.expertise && `· ${p.expertise}`}</p>
                <p className="mt-1 font-body text-xs text-muted-foreground">{p.address} · {p.phone}</p>
                {p.bio && <p className="mt-2 font-body text-sm text-foreground/80 italic">"{p.bio}"</p>}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(p.user_id)} className="gradient-gold text-primary-foreground font-body">
                    <Check className="h-4 w-4 ml-1" /> אשר
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(p.user_id)} className="border-destructive text-destructive font-body">
                    <X className="h-4 w-4 ml-1" /> דחה
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" /> חברים מאושרים ({approved.length})
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {approved.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-card p-4">
              <h4 className="font-serif text-base font-bold text-foreground">{p.full_name}</h4>
              <p className="font-body text-xs text-muted-foreground">{p.profession}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
