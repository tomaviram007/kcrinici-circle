import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Phone, Plus, MapPin, Banknote, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import gsap from "gsap";
import PageHero from "@/components/PageHero";
import { fireConfetti } from "@/lib/confetti";
import ClubAboutSection from "@/components/ClubAboutSection";
import heroImg from "@/assets/hero-jobs.jpg";

const JOB_TYPES = [
  { value: "full-time", label: "משרה מלאה" },
  { value: "part-time", label: "משרה חלקית" },
  { value: "freelance", label: "פרילנס" },
  { value: "temporary", label: "זמנית" },
  { value: "service", label: "שירות / עבודה חד פעמית" },
];

const EMPTY_FORM = { title: "", description: "", contact: "", category: "", location: "", job_type: "", salary: "", requirements: "", company_name: "" };

const Jobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
    <PageHero image={heroImg} title="הזדמנויות" highlight="בשכונה" subtitle="לוח דרושים אקסקלוסיבי לחברי המועדון — מצאו עבודה או פרסמו משרה" />
    <ClubAboutSection />
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-foreground sm:text-3xl">
            הזדמנויות <span className="text-gold">בשכונה</span>
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">לוח דרושים אקסקלוסיבי לחברי המועדון</p>
          <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> פרסם משרה
        </Button>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="שכר / תמורה" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="bg-background" autoComplete="off" />
            <Input placeholder="קטגוריה" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-background" autoComplete="off" />
            <Input placeholder="איש קשר / טלפון" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-background" autoComplete="off" />
          </div>
          <p className="font-body text-xs text-muted-foreground">* המשרה תפורסם לאחר אישור מנהל המערכת</p>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">שלח לאישור</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      <div ref={cardsRef} className="grid gap-3 sm:gap-5 md:grid-cols-2">
        {jobs.map((job) => (
          <div key={job.id} className="job-card rounded-lg border border-border bg-card p-4 sm:p-6 transition-shadow hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Briefcase className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-bold text-foreground">{job.title}</h3>
                {job.company_name && (
                  <p className="font-body text-sm text-gold flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" /> {job.company_name}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {job.job_type && <span className="inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-foreground">{jobTypeLabel(job.job_type)}</span>}
                  {job.category && <span className="inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
                </div>
              </div>
            </div>
            <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{job.description}</p>
            {job.requirements && (
              <div className="mt-3">
                <p className="font-body text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                  <FileText className="h-3 w-3 text-gold" /> דרישות:
                </p>
                <p className="font-body text-sm text-muted-foreground whitespace-pre-line">{job.requirements}</p>
              </div>
            )}
            <div className="mt-3 flex items-center gap-3 flex-wrap font-body text-sm text-muted-foreground">
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-gold" /> {job.location}
                </span>
              )}
              {job.salary && (
                <span className="flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-gold" /> {job.salary}
                </span>
              )}
              {job.contact && (
                <span className="flex items-center gap-1 text-gold">
                  <Phone className="h-3.5 w-3.5" /> {job.contact}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {jobs.length === 0 && <p className="font-body text-muted-foreground">אין משרות פעילות כרגע.</p>}
    </div>
    </>
  );
};

export default Jobs;
