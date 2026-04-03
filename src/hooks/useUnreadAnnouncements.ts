import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "last_seen_announcements";

export interface UnreadAnnouncement {
  id: string;
  title: string;
  created_at: string;
  category: string;
}

const getLastSeen = (): string =>
  localStorage.getItem(LS_KEY) ?? "2000-01-01T00:00:00Z";

export const markAnnouncementsAsSeen = () => {
  localStorage.setItem(LS_KEY, new Date().toISOString());
};

export const useUnreadAnnouncements = (userId: string | null) => {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<UnreadAnnouncement[]>([]);

  const fetchUnread = async () => {
    if (!userId) { setCount(0); setItems([]); return; }

    const lastSeen = getLastSeen();

    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, created_at, category")
      .eq("is_approved", true)
      .gt("created_at", lastSeen)
      .order("created_at", { ascending: false });

    if (error) { setCount(0); setItems([]); return; }

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

  // Re-check when localStorage changes (e.g. user visits announcements in same session)
  useEffect(() => {
    const onStorage = () => fetchUnread();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  return { count, items, refetch: fetchUnread };
};
