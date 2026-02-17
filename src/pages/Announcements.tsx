import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";

const Announcements = () => {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      setItems(data || []);
    };
    fetch();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          לוח <span className="text-gold">המודעות</span>
        </h1>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      {items.length === 0 ? (
        <p className="font-body text-muted-foreground">אין מודעות כרגע.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-6 transition-all hover:border-gold/20 hover:shadow-[0_0_30px_hsl(43_72%_52%/0.05)]" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                  <Megaphone className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 font-body text-base leading-relaxed text-muted-foreground whitespace-pre-line">{item.content}</p>
                  <p className="mt-3 font-body text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString("he-IL")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Announcements;
