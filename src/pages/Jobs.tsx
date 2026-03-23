import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Plus, MapPin, Banknote, Building2, FileText, MessageCircle, User, LayoutGrid, List, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import { fireConfetti } from "@/lib/confetti";

import QuoteSection from "@/components/landing/QuoteSection";
import heroImg from "@/assets/hero-jobs.jpg";
import { usePageCover } from "@/hooks/usePageCover";

const JOB_TYPES = [
  { value: "full-time", label: "משרה מלאה" },
  { value: "part-time", label: "משרה חלקית" },
  { value: "freelance", label: "פרילנס" },
  { value: "temporary", label: "זמנית" },
  { value: "service", label: "שירות / עבודה חד פעמית" },
];

const EMPTY_FORM = { title: "", description: "", contact: "", contact_name: "", category: "", location: "", job_type: "", salary: "", requirements: "", company_name: "" };

type ViewMode = "grid" | "list";

const Jobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const coverImage = usePageCover("jobs", heroImg);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterJobType, setFilterJobType] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const cardsRef = useRef<HTMLDivElement>(null);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("is_approved", true).eq("is_active", true).order("created_at", { ascending: false });
    setJobs(data || []);
  };

  useEffect(() => { fetchJobs(); }, []);

  useEffect(() => {
    if (jobs.length > 0 && cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll(".job-card");
      gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" });
    }
  }, [jobs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    const { error } = await supabase.from("jobs").insert({
      title: form.title.trim(),
      description: form.description.trim(),
      contact: form.contact.trim() || null,
      contact_name: form.contact_name.trim() || null,
      category: form.category.trim() || null,
      location: form.location.trim() || null,
      job_type: form.job_type || null,
      salary: form.salary.trim() || null,
      requirements: form.requirements.trim() || null,
      company_name: form.company_name.trim() || null,
    });
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "המשרה נשלחה לאישור!", description: "המשרה תפורסם לאחר אישור מנהל המערכת." });
    fireConfetti();
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const jobTypeLabel = (type: string | null) => JOB_TYPES.find(t => t.value === type)?.label || type || "";

  return (
    <>
    <PageHero image={coverImage} title="הזדמנויות" highlight="בשכונה" subtitle="לוח דרושים אקסקלוסיבי לחברי המועדון — מצאו עבודה או פרסמו משרה" />
    
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex flex-col gap-4">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground sm:text-3xl">
              הזדמנויות <span className="text-gold">בשכונה</span>
            </h1>
            <p className="mt-1 font-body text-sm text-muted-foreground">לוח דרושים אקסקלוסיבי לחברי המועדון</p>
            <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center rounded-md border border-border overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-secondary text-gold" : "text-muted-foreground hover:text-foreground"}`} title="תצוגת רשת"><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-secondary text-gold" : "text-muted-foreground hover:text-foreground"}`} title="תצוגת רשימה"><List className="h-4 w-4" /></button>
            </div>
            <Button size="sm" onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); }} className="gradient-gold text-primary-foreground font-body">
              <Plus className="h-4 w-4 ml-1" /> פרסם משרה
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="חיפוש חופשי..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="bg-background w-40 sm:w-52 h-9 font-body text-sm" autoComplete="off" />
          <Select value={filterJobType} onValueChange={setFilterJobType}>
            <SelectTrigger className="bg-background font-body w-36 h-9 text-sm"><SelectValue placeholder="סוג משרה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="bg-background font-body w-32 h-9 text-sm"><SelectValue placeholder="חודש" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל החודשים</SelectItem>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={i.toString()}>{new Date(2000, i).toLocaleDateString("he-IL", { month: "long" })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת המשרה *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" autoComplete="off" />
          <Input placeholder="שם החברה / מפרסם" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="bg-background" autoComplete="off" />
          <Textarea placeholder="תיאור המשרה *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-background min-h-[100px]" autoComplete="off" />
          <Textarea placeholder="דרישות התפקיד (ניסיון, כישורים, השכלה...)" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="bg-background min-h-[80px]" autoComplete="off" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
              <SelectTrigger className="bg-background font-body"><SelectValue placeholder="סוג משרה" /></SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="מיקום (עיר / אזור)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="bg-background" autoComplete="off" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="שכר / תמורה" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="bg-background" autoComplete="off" />
            <Input placeholder="קטגוריה" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-background" autoComplete="off" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input placeholder="שם איש קשר" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="bg-background" autoComplete="off" />
            <Input placeholder="טלפון איש קשר" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-background" dir="ltr" autoComplete="off" />
          </div>
          <p className="font-body text-xs text-muted-foreground">* המשרה תפורסם לאחר אישור מנהל המערכת</p>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">שלח לאישור</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      {(() => {
        const filtered = jobs.filter((job) => {
          if (filterJobType !== "all" && job.job_type !== filterJobType) return false;
          if (filterMonth !== "all") {
            const month = new Date(job.created_at).getMonth().toString();
            if (month !== filterMonth) return false;
          }
          if (searchText.trim()) {
            const q = searchText.trim().toLowerCase();
            if (!job.title.toLowerCase().includes(q) && !job.description.toLowerCase().includes(q) && !(job.company_name || "").toLowerCase().includes(q) && !(job.location || "").toLowerCase().includes(q)) return false;
          }
          return true;
        });
        return (
      <div
        ref={cardsRef}
        className={
          viewMode === "grid"
            ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "grid gap-4 grid-cols-1"
        }
      >
        {filtered.map((job) => (
          <div
            key={job.id}
            onClick={() => setSelectedJob(job)}
            className="job-card cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:shadow-[0_0_30px_hsl(43_72%_52%/0.1)] hover:border-gold/30"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Briefcase className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-base font-bold text-foreground truncate">{job.title}</h3>
                {job.company_name && (
                  <p className="font-body text-sm text-gold flex items-center gap-1 mt-0.5 truncate">
                    <Building2 className="h-3.5 w-3.5 shrink-0" /> {job.company_name}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {job.job_type && <span className="inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-foreground">{jobTypeLabel(job.job_type)}</span>}
                  {job.category && <span className="inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
                </div>
              </div>
            </div>
            <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground line-clamp-2">{job.description}</p>
            <div className="mt-2 flex items-center gap-3 flex-wrap font-body text-xs text-muted-foreground">
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
          </div>
        ))}
      </div>
        );
      })()}
      {jobs.length === 0 && <p className="font-body text-muted-foreground">אין משרות פעילות כרגע.</p>}

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-xl font-bold text-foreground">{selectedJob.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {selectedJob.company_name && (
                  <p className="font-body text-sm text-gold flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" /> {selectedJob.company_name}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedJob.job_type && <span className="inline-block rounded bg-secondary px-2.5 py-1 font-body text-xs text-foreground">{jobTypeLabel(selectedJob.job_type)}</span>}
                  {selectedJob.category && <span className="inline-block rounded bg-secondary px-2.5 py-1 font-body text-xs text-gold">{selectedJob.category}</span>}
                </div>
                <div>
                  <p className="font-body text-sm font-medium text-foreground mb-1">תיאור המשרה</p>
                  <p className="font-body text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{selectedJob.description}</p>
                </div>
                {selectedJob.requirements && (
                  <div>
                    <p className="font-body text-sm font-medium text-foreground flex items-center gap-1 mb-1">
                      <FileText className="h-3.5 w-3.5 text-gold" /> דרישות
                    </p>
                    <p className="font-body text-sm text-muted-foreground whitespace-pre-line">{selectedJob.requirements}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap font-body text-sm text-muted-foreground">
                  {selectedJob.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gold" /> {selectedJob.location}
                    </span>
                  )}
                  {selectedJob.salary && (
                    <span className="flex items-center gap-1">
                      <Banknote className="h-4 w-4 text-gold" /> {selectedJob.salary}
                    </span>
                  )}
                </div>
                {(selectedJob.contact_name || selectedJob.contact) && (
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="font-body text-sm font-medium text-foreground">פרטי יצירת קשר</p>
                    {selectedJob.contact_name && (
                      <span className="font-body text-sm text-gold flex items-center gap-1.5">
                        <User className="h-4 w-4" /> {selectedJob.contact_name}
                      </span>
                    )}
                    {selectedJob.contact && (
                      <a
                        href={`https://wa.me/${selectedJob.contact.replace(/[^0-9]/g, '').replace(/^0/, '972')}?text=${encodeURIComponent(`היי ${selectedJob.contact_name || ''} ראיתי את הפרסום של המשרה "${selectedJob.title}" שלך, אשמח לשמוע עוד פרטים`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-2 font-body text-sm text-green-600 hover:bg-green-600/20 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {selectedJob.contact}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    <QuoteSection page="jobs" />
    </>
  );
};

export default Jobs;
