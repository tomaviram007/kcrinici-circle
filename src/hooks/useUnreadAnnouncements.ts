import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnreadAnnouncement {
  id: string;
  title: string;
  created_at: string;
  category: string;
}

export const useUnreadAnnouncements = (userId: string | null) => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<UnreadAnnouncement[]>([]);

  const fetchUnread = async () => {
    if (!userId) { setCount(0); setItems([]); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("last_seen_announcements")
      .eq("user_id", userId)
      .maybeSingle();

    // If user has never visited announcements, show last 30 days as unread
    const lastSeen = (profile as any)?.last_seen_announcements
      ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabase
      .from("announcements")
      .select("id, title, created_at, category")
      .eq("is_approved", true)
      .gt("created_at", lastSeen)
      .order("created_at", { ascending: false });

    setCount(data?.length ?? 0);
    setItems((data as UnreadAnnouncement[]) ?? []);
  };

  useEffect(() => {
    fetchUnread();

    const channel = supabase
      .channel(`unread-ann-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { count, items, refetch: fetchUnread };
};
