import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ClubAboutSection = () => {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc("get_public_stats");
      if (!error && data) {
        setMemberCount((data as any).member_count ?? 0);
        setEventCount((data as any).event_count ?? 0);
      }
    };
    fetchStats();
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-5 py-8 sm:px-6 sm:py-14 text-center">
      <div className="mb-4 mx-auto h-px w-12 gradient-gold opacity-40" />
      <h2 className="font-serif text-xl font-bold text-foreground sm:text-2xl">
        אודות <span className="text-gold">המועדון</span>
      </h2>
      <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto sm:text-base">
        מועדון הגברים של ק.קרניצי הוא קהילה אקסקלוסיבית של שכנים, אנשי מקצוע ואנשי עשייה מהשכונה.
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
      </div>
    </section>
  );
};

export default ClubAboutSection;
