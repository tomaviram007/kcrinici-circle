import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserCheck } from "lucide-react";

interface AuditEntry {
  action: string;
  created_at: string;
  user_name: string;
}

interface CreatorBadgeProps {
  entityType: string;
  entityId: string;
  createdBy?: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: "יצירה",
  update: "עדכון",
  delete: "מחיקה",
  approve: "אישור",
};

const CreatorBadge = ({ entityType, entityId, createdBy }: CreatorBadgeProps) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = roles?.some((r: any) => r.role === "admin");
      setIsAdmin(!!admin);

      if (!admin) return;

      // Get creator name
      if (createdBy) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", createdBy)
          .single();
        setCreatorName(profile?.full_name || null);
      }

      // Get audit entries for this entity
      const { data: logs } = await supabase
        .from("audit_log")
        .select("action, created_at, user_name")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(10);
      
      setAuditEntries((logs as AuditEntry[]) || []);
      setLoaded(true);
    };
    check();
  }, [entityType, entityId, createdBy]);

  if (!isAdmin || !loaded || (!creatorName && auditEntries.length === 0)) return null;

  const displayName = auditEntries.length > 0 ? auditEntries[0].user_name : creatorName;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-body text-[10px] text-primary hover:bg-primary/20 transition-colors">
          <UserCheck className="h-3 w-3" />
          {displayName}
        </button>
      </PopoverTrigger>
      <PopoverContent dir="rtl" className="w-64 p-3" align="start">
        <p className="font-serif text-sm font-bold text-foreground mb-2">לוג פעולות</p>
        {auditEntries.length > 0 ? (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {auditEntries.map((entry, i) => (
              <div key={i} className="flex items-start justify-between gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
                <div>
                  <p className="font-body text-xs font-medium text-foreground">{entry.user_name}</p>
                  <p className="font-body text-[10px] text-muted-foreground">{ACTION_LABELS[entry.action] || entry.action}</p>
                </div>
                <span className="font-body text-[10px] text-muted-foreground shrink-0" dir="ltr">
                  {new Date(entry.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short" })}
                  {" "}
                  {new Date(entry.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-body text-xs text-muted-foreground">
            {creatorName ? `נוצר ע"י ${creatorName}` : "אין נתוני פעולות"}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CreatorBadge;
