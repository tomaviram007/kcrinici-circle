import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePendingCount = () => {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { count: c } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_approved", false)
      .eq("is_removed", false);
    setCount(c || 0);
  };

  useEffect(() => {
    fetchCount();
    const channel = supabase
      .channel("pending-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return count;
};
