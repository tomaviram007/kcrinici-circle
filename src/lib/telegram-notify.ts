import { supabase } from "@/integrations/supabase/client";

type EventType = "new_member" | "new_announcement" | "new_job" | "new_event" | "member_approved" | "new_deal";

export const sendTelegramNotification = async (eventType: EventType, data: Record<string, any>) => {
  try {
    await supabase.functions.invoke("admin-notify", {
      body: { event_type: eventType, data },
    });
  } catch (err) {
    // Silent fail - don't block the main flow
    console.error("Admin notification failed:", err);
  }
};
