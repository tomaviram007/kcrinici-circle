import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Phone } from "lucide-react";
import gsap from "gsap";

const Jobs = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false });
      setJobs(data || []);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (jobs.length > 0 && cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll(".job-card");
      gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" });

      // 3D tilt effect
      cards.forEach((card) => {
        const el = card as HTMLElement;
        el.addEventListener("mousemove", (e: MouseEvent) => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(el, { rotateY: x * 10, rotateX: -y * 10, duration: 0.3, ease: "power2.out", transformPerspective: 800 });
        });
        el.addEventListener("mouseleave", () => {
          gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.5, ease: "power2.out" });
        });
      });
    }
  }, [jobs]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          הזדמנויות <span className="text-gold">בשכונה</span>
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">לוח דרושים אקסקלוסיבי לחברי המועדון</p>
        <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
      </div>

      <div ref={cardsRef} className="grid gap-5 md:grid-cols-2">
        {jobs.map((job) => (
          <div key={job.id} className="job-card rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Briefcase className="h-5 w-5 text-gold" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">{job.title}</h3>
                {job.category && <span className="inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold mt-1">{job.category}</span>}
              </div>
            </div>
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">{job.description}</p>
            {job.contact && (
              <p className="mt-3 flex items-center gap-1 font-body text-sm text-gold">
                <Phone className="h-3.5 w-3.5" /> {job.contact}
              </p>
            )}
          </div>
        ))}
      </div>
      {jobs.length === 0 && <p className="font-body text-muted-foreground">אין משרות פעילות כרגע.</p>}
    </div>
  );
};

export default Jobs;
