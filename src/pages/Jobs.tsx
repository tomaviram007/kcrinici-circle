import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Phone, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import gsap from "gsap";

const Jobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", contact: "", category: "" });
  const cardsRef = useRef<HTMLDivElement>(null);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").eq("is_active", true).order("created_at", { ascending: false });
    setJobs(data || []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    fetchJobs();
  }, []);

  useEffect(() => {
    if (jobs.length > 0 && cardsRef.current) {
      const cards = cardsRef.current.querySelectorAll(".job-card");
      gsap.fromTo(cards, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" });
    }
  }, [jobs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (editId) {
      const { error } = await supabase.from("jobs").update(form).eq("id", editId);
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "עודכן בהצלחה!" });
    } else {
      const { error } = await supabase.from("jobs").insert({ ...form, created_by: userId });
      if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
      toast({ title: "מודעת דרושים פורסמה!" });
    }
    setForm({ title: "", description: "", contact: "", category: "" });
    setShowForm(false);
    setEditId(null);
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { toast({ title: "שגיאה", description: error.message, variant: "destructive" }); return; }
    toast({ title: "נמחק" });
    fetchJobs();
  };

  const startEdit = (job: any) => {
    setForm({ title: job.title, description: job.description, contact: job.contact || "", category: job.category || "" });
    setEditId(job.id);
    setShowForm(true);
  };

  const canModify = (job: any) => job.created_by === userId;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            הזדמנויות <span className="text-gold">בשכונה</span>
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">לוח דרושים אקסקלוסיבי לחברי המועדון</p>
          <div className="mt-3 h-px w-12 gradient-gold opacity-40" />
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", description: "", contact: "", category: "" }); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> פרסם משרה
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת המשרה" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תיאור המשרה" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-background" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="איש קשר / טלפון" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-background" />
            <Input placeholder="קטגוריה" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-background" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "פרסם"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm({ title: "", description: "", contact: "", category: "" }); }} className="font-body">ביטול</Button>
          </div>
        </form>
      )}

      <div ref={cardsRef} className="grid gap-5 md:grid-cols-2">
        {jobs.map((job) => (
          <div key={job.id} className="job-card rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-[0_0_30px_hsl(43_72%_52%/0.08)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
                <Briefcase className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-bold text-foreground">{job.title}</h3>
                {job.category && <span className="inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold mt-1">{job.category}</span>}
              </div>
              {canModify(job) && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(job)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              )}
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
