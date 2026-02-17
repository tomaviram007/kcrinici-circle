import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";

const AdminJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", contact: "", category: "" });

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs(data || []);
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await supabase.from("jobs").update(form).eq("id", editId);
      toast({ title: "עודכן!" });
    } else {
      await supabase.from("jobs").insert(form);
      toast({ title: "נוסף!" });
    }
    setForm({ title: "", description: "", contact: "", category: "" });
    setShowForm(false);
    setEditId(null);
    fetchJobs();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("jobs").delete().eq("id", id);
    toast({ title: "נמחק" });
    fetchJobs();
  };

  const startEdit = (job: any) => {
    setForm({ title: job.title, description: job.description, contact: job.contact || "", category: job.category || "" });
    setEditId(job.id);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-xl font-bold text-foreground">ניהול דרושים</h3>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: "", description: "", contact: "", category: "" }); }} className="gradient-gold text-primary-foreground font-body">
          <Plus className="h-4 w-4 ml-1" /> הוסף
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-border bg-card p-5 space-y-3">
          <Input placeholder="כותרת" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-background" />
          <Textarea placeholder="תיאור" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required className="bg-background" />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="איש קשר" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="bg-background" />
            <Input placeholder="קטגוריה" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="bg-background" />
          </div>
          <Button type="submit" className="gradient-gold text-primary-foreground font-body">{editId ? "עדכן" : "הוסף"}</Button>
        </form>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
            <div>
              <h4 className="font-serif text-base font-bold text-foreground">{job.title}</h4>
              <p className="font-body text-sm text-muted-foreground line-clamp-2">{job.description}</p>
              {job.category && <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
            </div>
            <div className="flex gap-1 shrink-0 mr-3">
              <Button variant="ghost" size="sm" onClick={() => startEdit(job)}><Edit2 className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminJobs;
