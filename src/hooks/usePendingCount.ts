import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingCount = () => {
  const [count, setCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let active = true;

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false)
        .eq("is_removed", false);
      if (active) setCount(c || 0);
    };

    fetchCount();

    // Guard against StrictMode double-invocation and leaked channels
    if (!channelRef.current) {
      const channel = supabase
        .channel(`pending-count-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => fetchCount()
        )
        .subscribe();
      channelRef.current = channel;
    }

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return count;
};
