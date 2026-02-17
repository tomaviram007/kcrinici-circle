import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BirthdayMember {
  full_name: string;
  birth_date: string;
  profession: string;
  avatar_url: string | null;
  user_id: string;
}

export function useBirthdaysThisWeek() {
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, birth_date, profession, avatar_url, user_id")
          .eq("is_approved", true)
          .not("birth_date", "is", null);

        if (error) throw error;

        const matched = (data || []).filter((p) => {
          if (!p.birth_date) return false;
          const bd = new Date(p.birth_date + "T00:00:00");
          const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
          return thisYearBd >= startOfWeek && thisYearBd <= endOfWeek;
        });

        setBirthdays(matched as BirthdayMember[]);
      } catch {
        setBirthdays([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { birthdays, loading };
}
