import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ClubAboutSection = () => {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: members } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", true);
      setMemberCount(members ?? 0);

      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
      const { count: events } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .gte("event_date", yearStart);
      setEventCount(events ?? 0);
    };
    fetchStats();
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:py-14 md:px-6 text-center">
      <div className="mb-4 mx-auto h-px w-12 gradient-gold opacity-40" />
      <h2 className="font-serif text-xl font-bold text-foreground sm:text-2xl">
        אודות <span className="text-gold">המועדון</span>
      </h2>
      <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto sm:text-base">
        מועדון הגברים של ק. קריניצי הוא קהילה אקסקלוסיבית של שכנים, אנשי מקצוע ואנשי עשייה מהשכונה.
        אנחנו מחברים בין אנשים, יוצרים הזדמנויות עסקיות, ובונים קהילה חזקה שמבוססת על אמון ושותפות.
      </p>
      <div className="mt-6 flex justify-center gap-8 sm:gap-12">
        <div>
          <p className="font-serif text-2xl font-bold text-gold sm:text-3xl">
            {memberCount !== null ? `${memberCount}+` : "..."}
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">חברי מועדון</p>
        </div>
        <div>
          <p className="font-serif text-2xl font-bold text-gold sm:text-3xl">
            {eventCount !== null ? `${eventCount}+` : "..."}
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">אירועים בשנה</p>
        </div>
        <div>
          <p className="font-serif text-2xl font-bold text-gold sm:text-3xl">∞</p>
          <p className="font-body text-xs text-muted-foreground mt-1">קשרים עסקיים</p>
        </div>
      </div>
    </section>
  );
};

export default ClubAboutSection;
