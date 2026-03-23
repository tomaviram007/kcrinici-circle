import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BirthdayMember {
  full_name: string;
  birth_date: string;
  profession: string;
  avatar_url: string | null;
  user_id: string;
  phone: string;
}

export function useBirthdaysToday() {
  const [birthdays, setBirthdays] = useState<BirthdayMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, birth_date, profession, avatar_url, user_id, phone")
          .eq("is_approved", true)
          .not("birth_date", "is", null);

        if (error) throw error;

        const now = new Date();
        const todayMonth = now.getMonth();
        const todayDate = now.getDate();

        const matched = (data || []).filter((p) => {
          if (!p.birth_date) return false;
          const bd = new Date(p.birth_date + "T00:00:00");
          return bd.getMonth() === todayMonth && bd.getDate() === todayDate;
        });

        setBirthdays(matched as BirthdayMember[]);
      } catch {
        setBirthdays([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBirthdays();
  }, []);

  return { birthdays, loading };
}
