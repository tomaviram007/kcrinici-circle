import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "approve";
export type EntityType = "event" | "deal" | "job" | "announcement" | "poll" | "recommendation" | "album" | "quote";

export const logAuditAction = async (
  action: AuditAction,
  entityType: EntityType,
  entityId?: string,
  entityTitle?: string,
  details?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    await supabase.from("audit_log").insert({
      user_id: user.id,
      user_name: profile?.full_name || "לא ידוע",
      action,
      entity_type: entityType,
      entity_id: entityId || undefined,
      entity_title: entityTitle || undefined,
      details: details || {},
    } as any);
  } catch (err) {
    console.error("Audit log error:", err);
  }
};
