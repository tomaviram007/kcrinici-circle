import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check, Clock, Plus, X, Power, Tag, Building2, MapPin, Banknote } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";

const JOB_TYPES = [
  { value: "full-time", label: "משרה מלאה" },
  { value: "part-time", label: "משרה חלקית" },
  { value: "freelance", label: "פרילנס" },
  { value: "temporary", label: "זמנית" },
  { value: "service", label: "שירות / עבודה חד פעמית" },
];

const EMPTY_FORM = { title: "", description: "", contact: "", category: "", location: "", job_type: "", salary: "", requirements: "", company_name: "" };

const AdminJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs(data || []);
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "שגיאה", description: "יש למלא כותרת ותיאור", variant: "destructive" });
      return;
    }
    setSubmitting(true);
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
      is_approved: true,
      is_active: true,
    });
    setSubmitting(false);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "פורסם!", description: "המשרה פורסמה בהצלחה." });
    fireConfetti();
    setForm(EMPTY_FORM);
    setShowForm(false);
    fetchJobs();
  };

  const handleApprove = async (id: string) => {
    await supabase.from("jobs").update({ is_approved: true }).eq("id", id);
    toast({ title: "המשרה אושרה!" });
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("jobs").delete().eq("id", id);
    toast({ title: "נמחק" });
    fetchJobs();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("jobs").update({ is_active: !current }).eq("id", id);
    toast({ title: !current ? "המשרה הופעלה" : "המשרה הושבתה" });
    fetchJobs();
  };

  const pending = jobs.filter((j) => !j.is_approved);
  const approved = jobs.filter((j) => j.is_approved);

  const categoryCounts = approved.reduce((acc: Record<string, number>, j) => {
    const cat = j.category || "ללא קטגוריה";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const getStatusLabel = (job: any) => {
    if (!job.is_approved) return { text: "ממתין לאישור", color: "text-yellow-600 bg-yellow-500/10" };
    if (!job.is_active) return { text: "לא פעיל", color: "text-muted-foreground bg-muted" };
    return { text: "פעיל", color: "text-green-600 bg-green-500/10" };
  };

  const jobTypeLabel = (type: string | null) => JOB_TYPES.find(t => t.value === type)?.label || type || "";

  return (
    <div className="space-y-8">
      {/* Category summary */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([cat, count]: [string, number]) => (
            <span key={cat} className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 font-body text-xs text-foreground">
              <Tag className="h-3 w-3 text-gold" />
              {cat}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Create button / form */}
      <div>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)} className="gradient-gold text-primary-foreground font-body">
            <Plus className="h-4 w-4 ml-1" /> פרסם משרה חדשה
          </Button>
        ) : (
          <div className="rounded-lg border border-gold/30 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-foreground">משרה חדשה</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}><X className="h-4 w-4" /></Button>
            </div>
            <Input placeholder="כותרת המשרה *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="font-body" dir="rtl" autoComplete="off" />
            <Input placeholder="שם החברה / מפרסם" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="font-body" dir="rtl" autoComplete="off" />
            <Textarea placeholder="תיאור המשרה *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="font-body min-h-[100px]" dir="rtl" autoComplete="off" />
            <Textarea placeholder="דרישות התפקיד (ניסיון, כישורים, השכלה...)" value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} className="font-body min-h-[80px]" dir="rtl" autoComplete="off" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                <SelectTrigger className="font-body"><SelectValue placeholder="סוג משרה" /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="מיקום (עיר / אזור)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="font-body" dir="rtl" autoComplete="off" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input placeholder="שכר / תמורה" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="font-body" dir="rtl" autoComplete="off" />
              <Input placeholder="קטגוריה (לדוגמה: שיפוצים)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="font-body" dir="rtl" autoComplete="off" />
              <Input placeholder="איש קשר / טלפון" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="font-body" dir="rtl" autoComplete="off" />
            </div>
            <Button onClick={handleCreate} disabled={submitting} className="gradient-gold text-primary-foreground font-body">
              {submitting ? "מפרסם..." : "פרסם משרה"}
            </Button>
          </div>
        )}
      </div>

      {/* Pending */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" /> ממתינות לאישור ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין משרות ממתינות.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((job) => (
              <div key={job.id} className="rounded-lg border border-gold/20 bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif text-base font-bold text-foreground">{job.title}</h4>
                    {job.company_name && <p className="font-body text-sm text-gold">{job.company_name}</p>}
                    <p className="font-body text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0 mr-3">
                    <Button size="sm" onClick={() => handleApprove(job.id)} className="gradient-gold text-primary-foreground font-body">
                      <Check className="h-3.5 w-3.5 ml-1" /> אשר
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {job.job_type && <span className="rounded bg-secondary px-2 py-0.5 font-body text-xs text-foreground">{jobTypeLabel(job.job_type)}</span>}
                  {job.category && <span className="rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
                  {job.location && <span className="font-body text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.location}</span>}
                  {job.salary && <span className="font-body text-xs text-muted-foreground flex items-center gap-0.5"><Banknote className="h-3 w-3" />{job.salary}</span>}
                  {job.contact && <span className="font-body text-xs text-muted-foreground">קשר: {job.contact}</span>}
                  <span className="font-body text-xs text-muted-foreground">פורסם: {new Date(job.created_at).toLocaleDateString("he-IL")}</span>
                </div>
                {job.requirements && <p className="font-body text-xs text-muted-foreground">דרישות: {job.requirements}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved */}
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" /> משרות מאושרות ({approved.length})
        </h3>
        <div className="space-y-3">
          {approved.map((job) => {
            const status = getStatusLabel(job);
            return (
              <div key={job.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif text-base font-bold text-foreground">{job.title}</h4>
                      <span className={`rounded-full px-2 py-0.5 font-body text-xs ${status.color}`}>{status.text}</span>
                    </div>
                    {job.company_name && <p className="font-body text-sm text-gold">{job.company_name}</p>}
                    <p className="font-body text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 mr-3">
                    <div className="flex items-center gap-1.5">
                      <Power className="h-3.5 w-3.5 text-muted-foreground" />
                      <Switch checked={job.is_active} onCheckedChange={() => toggleActive(job.id, job.is_active)} />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {job.job_type && <span className="rounded bg-secondary px-2 py-0.5 font-body text-xs text-foreground">{jobTypeLabel(job.job_type)}</span>}
                  {job.category && <span className="rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
                  {job.location && <span className="font-body text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="h-3 w-3" />{job.location}</span>}
                  {job.salary && <span className="font-body text-xs text-muted-foreground flex items-center gap-0.5"><Banknote className="h-3 w-3" />{job.salary}</span>}
                  {job.contact && <span className="font-body text-xs text-muted-foreground">קשר: {job.contact}</span>}
                  <span className="font-body text-xs text-muted-foreground">פורסם: {new Date(job.created_at).toLocaleDateString("he-IL")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminJobs;
