import { useEffect, useRef, useState } from "react";
import { Users, Megaphone, Briefcase, Calendar, BarChart3, Image, Shield, Quote, ImageIcon, Award, Search, ChevronDown, Tv, Package, Mail, Eye, MailX, FileEdit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePendingCount } from "@/hooks/usePendingCount";
import gsap from "gsap";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed?: boolean;
  hasPermission?: (permission: string) => boolean;
}

const TAB_PERMISSION_MAP: Record<string, string> = {
  members: "manage_members",
  team: "manage_team",
  announcements: "manage_announcements",
  jobs: "manage_jobs",
  events: "manage_events",
  recommendations: "manage_recommendations",
  deals: "manage_deals",
  gallery: "manage_gallery",
  polls: "manage_polls",
  quotes: "manage_quotes",
  logo: "manage_settings",
  covers: "manage_quotes",
  ads: "manage_settings",
  secondhand: "manage_deals",
  communication: "manage_settings",
};

const groups = [
  {
    label: "ניהול חברים",
    items: [
      { id: "members", label: "בקשות הצטרפות", icon: Users, showBadge: true },
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

const AdminSidebar = ({ activeTab, onTabChange, collapsed = false, hasPermission }: AdminSidebarProps) => {
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach((g) => {
      initial[g.label] = true;
    });
    return initial;
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const pendingCount = usePendingCount();

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { x: 40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      );
    }
  }, []);

  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (search && !item.label.includes(search)) return false;
        if (hasPermission) {
          const perm = TAB_PERMISSION_MAP[item.id];
          if (perm && !hasPermission(perm)) return false;
        }
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={sidebarRef}
        className={cn(
          "shrink-0 rounded-2xl border border-border/50 p-3 transition-all duration-300",
          "bg-card/60 backdrop-blur-xl shadow-lg",
          collapsed ? "w-16" : "w-56"
        )}
        dir="rtl"
      >
        {/* Search */}
        {!collapsed && (
          <div className="relative mb-3">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="חיפוש מהיר..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pr-8 text-xs bg-background/60 border-border/40 placeholder:text-muted-foreground/60"
            />
          </div>
        )}

        {/* Groups */}
        <nav className="space-y-1">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {/* Group header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      !openGroups[group.label] && "-rotate-90"
                    )}
                  />
                </button>
              )}

              {/* Group items */}
              {(collapsed || openGroups[group.label]) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const hasBadge = 'showBadge' in item && item.showBadge && pendingCount > 0;
                    const button = (
                      <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200",
                          collapsed && "justify-center px-0",
                          isActive
                            ? "bg-primary/15 text-primary shadow-[inset_0_0_12px_hsl(var(--primary)/0.1)]"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        )}
                      >
                        <div className="relative">
                          <item.icon
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                          {hasBadge && collapsed && (
                            <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                              {pendingCount}
                            </span>
                          )}
                        </div>
                        {!collapsed && <span>{item.label}</span>}
                        {hasBadge && !collapsed && (
                          <span className="mr-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                            {pendingCount}
                          </span>
                        )}
                        {isActive && !collapsed && !hasBadge && (
                          <span className="mr-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                        )}
                      </button>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>{button}</TooltipTrigger>
                          <TooltipContent side="left" className="font-body text-xs">
                            {item.label}
                            {hasBadge && ` (${pendingCount})`}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return button;
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  );
};

export default AdminSidebar;
