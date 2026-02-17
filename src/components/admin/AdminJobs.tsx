import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Check, Clock } from "lucide-react";

const AdminJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);

  const fetchJobs = async () => {
    const { data } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
    setJobs(data || []);
  };

  useEffect(() => { fetchJobs(); }, []);

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

  const pending = jobs.filter((j) => !j.is_approved);
  const approved = jobs.filter((j) => j.is_approved);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold" /> ממתינות לאישור ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted-foreground">אין משרות ממתינות.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((job) => (
              <div key={job.id} className="flex items-start justify-between rounded-lg border border-gold/20 bg-card p-4">
                <div>
                  <h4 className="font-serif text-base font-bold text-foreground">{job.title}</h4>
                  <p className="font-body text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  {job.category && <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
                  {job.contact && <p className="mt-1 font-body text-xs text-muted-foreground">קשר: {job.contact}</p>}
                </div>
                <div className="flex gap-1 shrink-0 mr-3">
                  <Button size="sm" onClick={() => handleApprove(job.id)} className="gradient-gold text-primary-foreground font-body">
                    <Check className="h-3.5 w-3.5 ml-1" /> אשר
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 font-serif text-xl font-bold text-foreground flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" /> משרות מאושרות ({approved.length})
        </h3>
        <div className="space-y-3">
          {approved.map((job) => (
            <div key={job.id} className="flex items-start justify-between rounded-lg border border-border bg-card p-4">
              <div>
                <h4 className="font-serif text-base font-bold text-foreground">{job.title}</h4>
                <p className="font-body text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                {job.category && <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 font-body text-xs text-gold">{job.category}</span>}
              </div>
              <div className="flex gap-1 shrink-0 mr-3">
                <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminJobs;
