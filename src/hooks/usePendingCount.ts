import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingCount = () => {
  const [count, setCount] = useState(0);

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

    const channel = supabase
      .channel(`pending-count-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
};
