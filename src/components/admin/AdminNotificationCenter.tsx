import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Users, Briefcase, Award, Megaphone, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import gsap from "gsap";

interface PendingCounts {
  members: number;
  deals: number;
  recommendations: number;
  announcements: number;
  jobs: number;
}

interface AdminNotificationCenterProps {
  onNavigate: (tab: string) => void;
}

const CATEGORIES = [
  { key: "members" as const, label: "חברים ממתינים לאישור", icon: Users, tab: "members" },
  { key: "deals" as const, label: "הטבות ממתינות לאישור", icon: Briefcase, tab: "deals" },
  { key: "recommendations" as const, label: "המלצות ממתינות לאישור", icon: Award, tab: "recommendations" },
  { key: "announcements" as const, label: "מודעות ממתינות לאישור", icon: Megaphone, tab: "announcements" },
  { key: "jobs" as const, label: "משרות ממתינות לאישור", icon: Briefcase, tab: "jobs" },
];

const AdminNotificationCenter = ({ onNavigate }: AdminNotificationCenterProps) => {
  const [counts, setCounts] = useState<PendingCounts>({ members: 0, deals: 0, recommendations: 0, announcements: 0, jobs: 0 });
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasShaken = useRef(false);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const fetchCounts = useCallback(async () => {
    const [
      { count: membersCount },
      { count: dealsCount },
      { count: recsCount },
      { count: announcementsCount },
      { count: jobsCount },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_approved", false).eq("is_removed", false),
      supabase.from("deals").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("professional_recommendations").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("announcements").select("*", { count: "exact", head: true }).eq("is_approved", false),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("is_approved", false),
    ]);
    setCounts({
      members: membersCount || 0,
      deals: dealsCount || 0,
      recommendations: recsCount || 0,
      announcements: announcementsCount || 0,
      jobs: jobsCount || 0,
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "professional_recommendations" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => fetchCounts())
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchCounts]);

  // Bell shake animation when there are pending items
  useEffect(() => {
    if (total > 0 && bellRef.current && !hasShaken.current) {
      hasShaken.current = true;
      gsap.to(bellRef.current, {
        rotation: 15,
        duration: 0.1,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          gsap.set(bellRef.current, { rotation: 0 });
        },
      });
    }
    if (total === 0) hasShaken.current = false;
  }, [total]);

  // Dropdown animation
  useEffect(() => {
    if (open && dropdownRef.current) {
      gsap.fromTo(
        dropdownRef.current,
        { opacity: 0, y: -10, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power3.out" }
      );
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleItemClick = (tab: string) => {
    onNavigate(tab);
    setOpen(false);
  };

  const activeCategories = CATEGORIES.filter((c) => counts[c.key] > 0);

  return (
    <div className="relative" dir="rtl">
      {/* Bell Button */}
      <button
        ref={bellRef}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "relative flex items-center justify-center h-10 w-10 rounded-xl transition-all duration-200",
          "bg-card/60 backdrop-blur-xl border border-border/50 hover:bg-secondary/60",
          open && "bg-primary/10 border-primary/30"
        )}
        aria-label="התראות"
      >
        <Bell className={cn("h-5 w-5 transition-colors", total > 0 ? "text-primary" : "text-muted-foreground")} />
        {total > 0 && (
          <span className="absolute -top-1.5 -left-1.5 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-lg animate-scale-in">
            {total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute top-full mt-2 left-0 w-72 rounded-2xl border border-border/50 p-3",
            "bg-card/80 backdrop-blur-2xl shadow-2xl z-50"
          )}
        >
          <p className="font-serif text-sm font-bold text-foreground mb-2 px-1">
            התראות ניהול
          </p>

          {activeCategories.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body px-1 py-3 text-center">
              🎉 אין פריטים ממתינים!
            </p>
          ) : (
            <div className="space-y-1">
              {activeCategories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => handleItemClick(cat.tab)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-body transition-all hover:bg-secondary/60 group"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                    <cat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-foreground font-medium">
                      {counts[cat.key]} {cat.label}
                    </span>
                  </div>
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter;
