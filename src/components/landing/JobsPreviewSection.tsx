import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Lock, MapPin, Banknote, Building2, MessageCircle, FileText, User, Pencil } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import gsap from "gsap";

interface Props {
  isApproved: boolean;
}

const JOB_TYPES_MAP: Record<string, string> = {
  "full-time": "משרה מלאה", "part-time": "משרה חלקית",
  freelance: "פרילנס", temporary: "זמנית", service: "שירות",
};

const JobsPreviewSection = ({ isApproved }: Props) => {
  const navigate = useNavigate();
  const { hasPermission } = useUserPermissions();
  const canEditJobs = hasPermission("manage_jobs");
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("*")
      .eq("is_approved", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setJobs(data || []));
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          const cards = sectionRef.current?.querySelectorAll(".job-preview-card");
          if (cards) gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.15, ease: "power3.out" });
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [jobs]);

  const mockJobs = [
    { id: "m1", title: "מנהל שיווק דיגיטלי", company_name: "סטארטאפ מקומי", location: "רמת גן", job_type: "full-time", description: "חיפוש מנהל שיווק מנוסה" },
    { id: "m2", title: "מעצב UX/UI", company_name: "סטודיו עיצוב", location: "תל אביב", job_type: "freelance", description: "פרויקט עיצוב אפליקציה" },
    { id: "m3", title: "יועץ פיננסי", company_name: "משרד רואי חשבון", location: "ק.קרניצי", job_type: "part-time", description: "ייעוץ פיננסי לעסקים קטנים" },
  ];

  // Hide section entirely when no real jobs exist
  if (jobs.length === 0) return null;

  const displayItems = isApproved ? jobs : mockJobs;


  return (
    <section className="py-8 px-5 sm:py-24 sm:px-6" ref={sectionRef}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 sm:mb-16 text-center">
          <p className="mb-2 font-body text-xs sm:text-sm tracking-[0.3em] text-gold/70 uppercase">{t("landing.jobs.label")}</p>
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-4xl md:text-5xl">
            {t("landing.jobs.title1")} <span className="text-gold">{t("landing.jobs.title2")}</span>
          </h2>
          <div className="mt-4 mx-auto h-px w-16 gradient-gold opacity-40" />
          {canEditJobs && (
            <button
              onClick={() => navigate("/admin?tab=jobs")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 px-3 py-1.5 font-body text-xs text-gold hover:bg-gold/30 transition-colors"
            >
              <Pencil className="h-3 w-3" /> {t("jobs.editBtn")}
            </button>
          )}
        </div>

        {displayItems.length > 0 ? (
          <div className="relative grid gap-4 sm:gap-6 md:grid-cols-3">
            {displayItems.map((job, i) => (
              <div
                key={job.id || i}
                className="job-preview-card opacity-0"
                onClick={() => isApproved && jobs.length > 0 && setSelected(job)}
              >
                <div className={`rounded-lg border border-border bg-card p-5 sm:p-8 transition-all duration-500 hover:border-gold/30 hover:shadow-[0_0_40px_hsl(43_72%_52%/0.08)] ${isApproved && jobs.length > 0 ? "cursor-pointer" : ""} ${!isApproved ? "select-none" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                      <Briefcase className="h-5 w-5 text-gold" />
                    </div>
                    {job.job_type && (
                      <span className="font-body text-xs text-gold/70">{JOB_TYPES_MAP[job.job_type] || job.job_type}</span>
                    )}
                  </div>
                  <h3 className={`font-serif text-xl font-bold text-foreground ${!isApproved ? "blur-[3px]" : ""}`}>{job.title}</h3>
                  {job.company_name && (
                    <p className={`mt-1 font-body text-sm text-gold flex items-center gap-1 ${!isApproved ? "blur-[4px]" : ""}`}>
                      <Building2 className="h-3.5 w-3.5" /> {job.company_name}
                    </p>
                  )}
                  <p className={`mt-2 font-body text-sm leading-relaxed text-muted-foreground line-clamp-2 ${!isApproved ? "blur-[4px]" : ""}`}>{job.description}</p>
                  <div className={`mt-3 flex items-center gap-3 font-body text-xs text-muted-foreground ${!isApproved ? "blur-[4px]" : ""}`}>
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-gold" /> {job.location}
                      </span>
                    )}
                    {job.salary && (
                      <span className="flex items-center gap-1">
                        <Banknote className="h-3 w-3 text-gold" /> {job.salary}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-body text-xs text-muted-foreground">
                    {job.created_at ? new Date(job.created_at).toLocaleDateString("he-IL") : ""}
                  </p>
                </div>
              </div>
            ))}

            {!isApproved && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Link to="/register" className="pointer-events-auto flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 backdrop-blur-sm px-6 py-3 font-body text-sm text-gold hover:bg-gold/10 transition-colors">
                  <Lock className="h-4 w-4" />
                  {t("landing.bulletin.joinBtn")}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 rounded-lg border border-border bg-card">
            <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-body text-sm text-muted-foreground">{t("landing.jobs.noJobs")}</p>
            <Link to="/jobs" className="font-body text-xs text-gold hover:underline mt-1 inline-block">{t("landing.jobs.allJobs")}</Link>
          </div>
        )}

        {isApproved && (
          <div className="mt-8 text-center">
            <Link to="/jobs" className="font-body text-sm text-gold hover:underline">
              {t("landing.jobs.allJobs")}
            </Link>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">{t("landing.jobs.detailsTitle")}</DialogTitle>
          <DialogDescription className="sr-only">פרטי המשרה</DialogDescription>
          {selected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-serif text-2xl font-bold text-foreground">{selected.title}</h3>
                {selected.company_name && (
                  <p className="mt-1 font-body text-sm text-gold flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" /> {selected.company_name}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.job_type && <span className="inline-block rounded bg-secondary px-2.5 py-1 font-body text-xs text-foreground">{JOB_TYPES_MAP[selected.job_type] || selected.job_type}</span>}
                {selected.category && <span className="inline-block rounded bg-secondary px-2.5 py-1 font-body text-xs text-gold">{selected.category}</span>}
              </div>
              <div>
                <p className="font-body text-sm font-medium text-foreground mb-1">{t("landing.jobs.jobDesc")}</p>
                <p className="font-body text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{selected.description}</p>
              </div>
              {selected.requirements && (
                <div>
                  <p className="font-body text-sm font-medium text-foreground flex items-center gap-1 mb-1">
                    <FileText className="h-3.5 w-3.5 text-gold" /> {t("landing.jobs.requirements")}
                  </p>
                  <p className="font-body text-sm text-muted-foreground whitespace-pre-line">{selected.requirements}</p>
                </div>
              )}
              <div className="flex items-center gap-4 flex-wrap font-body text-sm text-muted-foreground">
                {selected.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-gold" /> {selected.location}</span>}
                {selected.salary && <span className="flex items-center gap-1"><Banknote className="h-4 w-4 text-gold" /> {selected.salary}</span>}
              </div>
              {(selected.contact_name || selected.contact) && (
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="font-body text-sm font-medium text-foreground">{t("landing.jobs.contact")}</p>
                  {selected.contact_name && (
                    <span className="font-body text-sm text-gold flex items-center gap-1.5">
                      <User className="h-4 w-4" /> {selected.contact_name}
                    </span>
                  )}
                  {selected.contact && (
                    <a
                      href={`https://wa.me/${selected.contact.replace(/[^0-9]/g, '').replace(/^0/, '972')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-2 font-body text-sm text-green-600 hover:bg-green-600/20 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" /> {selected.contact}
                    </a>
                  )}
                </div>
              )}
              <p className="font-body text-xs text-muted-foreground">
                פורסם: {selected.created_at ? new Date(selected.created_at).toLocaleDateString("he-IL") : ""}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default JobsPreviewSection;
